import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { unifiedMeasurementSchema } from "@/lib/validators/measurements-unified";

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
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = unifiedMeasurementSchema.parse(body);

    // Check for duplicate profile name
    const existing = await prisma.measurementProfile.findFirst({
      where: {
        userId: session.user.id,
        profileName: parsed.profileName,
        deletedAt: null,
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A profile named "${parsed.profileName}" already exists` },
        { status: 409 }
      );
    }

    // If this is the first profile, make it default
    const profileCount = await prisma.measurementProfile.count({
      where: { userId: session.user.id, deletedAt: null },
    });
    const isDefault = profileCount === 0 ? true : parsed.isDefault;

    // If setting as default, unset others for same garmentType
    if (isDefault) {
      await prisma.measurementProfile.updateMany({
        where: {
          userId: session.user.id,
          garmentType: parsed.garmentType,
          deletedAt: null,
        },
        data: { isDefault: false },
      });
    }

    const profile = await prisma.measurementProfile.create({
      data: {
        ...parsed,
        userId: session.user.id,
        isDefault,
        status: "pending",
      },
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating measurement profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}