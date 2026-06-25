import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { unifiedMeasurementSchema, mapToPrismaFields } from "@/lib/validators/measurements-unified";
import { Prisma } from "@prisma/client";
import { validateCsrf } from "@/lib/csrf";

/**
 * GET /api/measurements
 * List ALL measurement profiles for the authenticated user.
 * Ownership enforced: only returns profiles where userId === session.user.id
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profiles = await prisma.measurementProfile.findMany({
      where: { userId: session.user.id, deletedAt: null, source: "profile" },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
        id: true,
        profileName: true,
        isDefault: true,
        gender: true,
        garmentType: true,
        source: true,
        notes: true,
        deliveryDate: true,
        updatedAt: true,
        shalwar1: true,
        ladSimpleShalwar1: true,
        ladShalwarBelt1: true,
        trouserdata1: true,
      },
    });

    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("Error fetching measurement profiles:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/measurements
 * Create a new measurement profile for the authenticated user.
 * Ownership enforced: always sets userId to session.user.id
 *
 * Handles:
 *  - Soft-deleted profile restore: if a deleted profile with same name exists, restore it
 *  - P2002 unique constraint violations (safety net for race conditions)
 *  - Transaction wrapping to eliminate TOCTOU race between check and create
 *
 * Created profiles always have:
 *  - source: "profile" (NOT a tailor request)
 *  - status: uses Prisma default ("complete") — NOT "pending"
 *  - requestedAt: null (only set for tailor requests)
 */
export async function POST(request: NextRequest) {
  try {
    await validateCsrf(request);
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = unifiedMeasurementSchema.parse(body);

    if (parsed.profileName === "Admin Default") {
      return NextResponse.json({ error: "The name 'Admin Default' is reserved for admin use." }, { status: 400 });
    }

    console.log("[measurements] Creating profile:", { userId: session.user.id, profileName: parsed.profileName, garmentType: parsed.garmentType });

    const profile = await prisma.$transaction(async (tx) => {
      // ── Check 1: Active duplicate (soft-deleted records excluded) ──────
      const existingActive = await tx.measurementProfile.findFirst({
        where: {
          userId: session.user.id,
          profileName: parsed.profileName,
          deletedAt: null,
        },
      });

      if (existingActive) {
        throw new ProfileNameConflictError(
          `A profile named "${parsed.profileName}" already exists`,
          "active"
        );
      }

      // ── Check 2: Soft-deleted duplicate → restore it ──────────────────
      const existingDeleted = await tx.measurementProfile.findFirst({
        where: {
          userId: session.user.id,
          profileName: parsed.profileName,
          deletedAt: { not: null },
        },
      });

      if (existingDeleted) {
        // Restore the soft-deleted profile with new field values
        const prismaFields = mapToPrismaFields(parsed);
        const activeCount = await tx.measurementProfile.count({
          where: {
            userId: session.user.id,
            garmentType: parsed.garmentType,
            deletedAt: null,
          },
        });
        const isDefault = activeCount === 0 ? true : parsed.isDefault;

        if (isDefault) {
          await tx.measurementProfile.updateMany({
            where: {
              userId: session.user.id,
              deletedAt: null,
            },
            data: { isDefault: false },
          });
        }

        const restored = await tx.measurementProfile.update({
          where: { id: existingDeleted.id },
          data: {
            ...prismaFields,
            isDefault,
            deletedAt: null,
            source: "profile",
            updatedAt: new Date(),
          },
        });

        return restored;
      }

      // ── Check 3: Count active profiles (for isDefault logic) ──────────
      const profileCount = await tx.measurementProfile.count({
        where: { userId: session.user.id, deletedAt: null },
      });
      const isDefault = profileCount === 0 ? true : parsed.isDefault;

      if (isDefault) {
        await tx.measurementProfile.updateMany({
          where: {
            userId: session.user.id,
            deletedAt: null,
          },
          data: { isDefault: false },
        });
      }

      // ── Create new profile (source: "profile", no status or requestedAt) ──
      const created = await tx.measurementProfile.create({
        data: {
          ...mapToPrismaFields(parsed),
          userId: session.user.id,
          isDefault,
          source: "profile",
        },
      });

      return created;
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof ProfileNameConflictError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    // ── Prisma unique constraint violation (safety net) ──
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "A profile with this name already exists" },
        { status: 409 }
      );
    }

    // ── Prisma foreign key violation (e.g. invalid userId) ──
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      console.error("P2003: Foreign key violation for measurements profile:",
        { meta: error.meta });
      return NextResponse.json(
        { error: "Failed to create profile: referenced record not found." },
        { status: 500 }
      );
    }

    // ── Prisma "record not found" (e.g. update on non-existent row) ──
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      console.error("P2025: Record not found in measurements transaction:",
        { meta: error.meta });
      return NextResponse.json(
        { error: "Failed to create profile: related record not found." },
        { status: 500 }
      );
    }

    // ── Prisma transaction conflict / serialisation error ──
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      console.error("P2034: Transaction conflict in measurements — retry recommended");
      return NextResponse.json(
        { error: "A conflict occurred. Please try again." },
        { status: 409 }
      );
    }

    // ── Any other Prisma known error with a code ──
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Unhandled Prisma error code", error.code, ":", error.meta);
      return NextResponse.json(
        { error: `Database error (${error.code}). Please try again.` },
        { status: 500 }
      );
    }

    // ── Prisma validation error (field mismatch, etc.) ──
    if (error instanceof Prisma.PrismaClientValidationError) {
      console.error("Prisma validation error in measurements POST:", error.message);
      return NextResponse.json(
        { error: `Data validation error. Please check your inputs.` },
        { status: 400 }
      );
    }

    // ── Prisma initialisation / connection error ──
    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error("Prisma init error in measurements POST:", error.message);
      return NextResponse.json(
        { error: "Database connection error. Please try again later." },
        { status: 503 }
      );
    }

    // ── Prisma Rust panic ──
    if (error instanceof Prisma.PrismaClientRustPanicError) {
      console.error("Prisma Rust panic in measurements POST:", error.message);
      return NextResponse.json(
        { error: "Internal database engine error. Please try again." },
        { status: 500 }
      );
    }

    // ── CSRF validation failure — return 403, not 500 ──
    if (error instanceof Error && error.message === "CSRF validation failed") {
      return NextResponse.json(
        { error: "Forbidden: invalid CSRF token" },
        { status: 403 }
      );
    }

    // ⚠️ FULL error logging — every field, always
    console.error("FATAL: POST /api/measurements failed. Full details below.");
    console.error("  message :", error instanceof Error ? error.message : String(error));
    console.error("  name    :", error?.constructor?.name ?? "unknown");
    if (error instanceof Error && error.stack) {
      // Stack first line is the message, skip it since we already logged it
      const stackLines = error.stack.split("\n").slice(1).join("\n");
      console.error("  stack   :", stackLines);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("  prisma  :", { code: error.code, meta: error.meta });
    }

    // Dev-friendly debug info
    const isDev = process.env.NODE_ENV === "development";
    const devDetail = isDev && error instanceof Error
      ? ` [${error.name}: ${error.message}]`
      : "";

    return NextResponse.json(
      { error: `Failed to create measurement profile. Please try again.${devDetail}` },
      { status: 500 }
    );
  }
}

/**
 * Custom error class for profile name conflicts — allows distinguishing
 * between "active duplicate" and other errors without string-matching.
 */
class ProfileNameConflictError extends Error {
  public readonly conflictType: string;

  constructor(message: string, conflictType: string) {
    super(message);
    this.name = "ProfileNameConflictError";
    this.conflictType = conflictType;
  }
}