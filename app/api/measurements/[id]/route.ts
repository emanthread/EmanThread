import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { unifiedMeasurementSchema, mapToPrismaFields } from "@/lib/validators/measurements-unified";
import { validateCsrf } from "@/lib/csrf";

/**
 * Helper: fetch a profile ensuring it belongs to the current user.
 * Returns null if not found or not owned.
 */
async function getOwnedProfile(id: string, userId: string) {
  return prisma.measurementProfile.findFirst({
    where: { id, userId, deletedAt: null },
  });
}

/**
 * GET /api/measurements/[id]
 * Get a single measurement profile (ownership enforced).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const profile = await getOwnedProfile(id, session.user.id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error fetching measurement profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/measurements/[id]
 * Update a measurement profile (ownership enforced).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await validateCsrf(request);
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const profile = await getOwnedProfile(id, session.user.id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.isDefault && profile.status === "approved" && profile.profileName === "Admin Default") {
      return NextResponse.json({ error: "This profile is read-only and cannot be modified." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = unifiedMeasurementSchema.partial().parse(body);

    if (parsed.profileName === "Admin Default") {
      return NextResponse.json({ error: "The name 'Admin Default' is reserved for admin use." }, { status: 400 });
    }

    // If changing profileName, check for duplicates
    if (parsed.profileName && parsed.profileName !== profile.profileName) {
      const existing = await prisma.measurementProfile.findFirst({
        where: {
          userId: session.user.id,
          profileName: parsed.profileName,
          id: { not: id },
          deletedAt: null,
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: `A profile named "${parsed.profileName}" already exists` },
          { status: 409 }
        );
      }
    }

    // If setting as default, unset all other defaults globally
    if (parsed.isDefault) {
      await prisma.measurementProfile.updateMany({
        where: {
          userId: session.user.id,
          id: { not: id },
          deletedAt: null,
        },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.measurementProfile.update({
      where: { id },
      data: {
        ...mapToPrismaFields(parsed as any),
        ...(parsed.isDefault !== undefined ? { isDefault: parsed.isDefault } : {}),
      },
    });

    return NextResponse.json({ profile: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    // ── Prisma known errors ──
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json({ error: "A profile with this name already exists" }, { status: 409 });
      }
      if (error.code === "P2022") {
        console.error("P2022: Column missing in measurements PUT:", error.meta);
        return NextResponse.json({ error: "Database schema mismatch. Contact support." }, { status: 500 });
      }
      console.error(`Prisma error ${error.code}:`, error.meta);
      return NextResponse.json({ error: `Database error (${error.code}).` }, { status: 500 });
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      console.error("Prisma validation error:", error.message);
      return NextResponse.json({ error: "Data validation error." }, { status: 400 });
    }

    console.error("Error updating measurement profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/measurements/[id]
 * Soft-delete a measurement profile (ownership enforced).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await validateCsrf(request);
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const profile = await getOwnedProfile(id, session.user.id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.isDefault && profile.status === "approved" && profile.profileName === "Admin Default") {
      return NextResponse.json({ error: "This profile is read-only and cannot be deleted." }, { status: 403 });
    }

    // Soft delete
    await prisma.measurementProfile.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // If the deleted profile was default, assign a new default
    if (profile.isDefault) {
      const nextDefault = await prisma.measurementProfile.findFirst({
        where: {
          userId: session.user.id,
          garmentType: profile.garmentType,
          deletedAt: null,
        },
        orderBy: { updatedAt: "desc" },
      });
      if (nextDefault) {
        await prisma.measurementProfile.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // ── Prisma known errors ──
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2022") {
        console.error("P2022: Column missing in measurements DELETE:", error.meta);
        return NextResponse.json({ error: "Database schema mismatch. Contact support." }, { status: 500 });
      }
      console.error(`Prisma error ${error.code}:`, error.meta);
      return NextResponse.json({ error: `Database error (${error.code}).` }, { status: 500 });
    }

    console.error("Error deleting measurement profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}