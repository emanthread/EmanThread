import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { unifiedMeasurementSchema, mapToPrismaFields } from "@/lib/validators/measurements-unified";
import { Prisma } from "@prisma/client";

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
      where: { userId: session.user.id, deletedAt: null },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        profileName: true,
        isDefault: true,
        gender: true,
        garmentType: true,
        source: true,
        status: true,
        notes: true,
        deliveryDate: true,
        requestedAt: true,
        updatedAt: true,
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = unifiedMeasurementSchema.parse(body);

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
              garmentType: parsed.garmentType,
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
            garmentType: parsed.garmentType,
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

    // P2002 = Prisma unique constraint violation (safety net)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "A profile with this name already exists" },
        { status: 409 }
      );
    }

    console.error("Error creating measurement profile:", error);
    return NextResponse.json(
      { error: "Failed to create measurement profile. Please try again." },
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