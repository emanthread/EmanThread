import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { unifiedMeasurementSchema, mapToPrismaFields } from "@/lib/validators/measurements-unified";

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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const profile = await getOwnedProfile(id, session.user.id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = unifiedMeasurementSchema.partial().parse(body);

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
    console.error("Error updating measurement profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/measurements/[id]
 * Soft-delete a measurement profile (ownership enforced).
 */
export async function DELETE(
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
    console.error("Error deleting measurement profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}