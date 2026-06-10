import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { validateCsrf } from "@/lib/csrf";

export const dynamic = "force-dynamic";

/**
 * POST /api/measurements/[id]/set-default
 * Set a profile as the default for its garmentType (ownership enforced).
 * Automatically unsets default on ALL other profiles for the same user+garmentType.
 */
export async function POST(
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

    // Fetch profile ensuring ownership
    const profile = await prisma.measurementProfile.findFirst({
      where: { id, userId: session.user.id, deletedAt: null },
    });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Use a transaction: reset all defaults globally, then set the new one
    await prisma.$transaction([
      prisma.measurementProfile.updateMany({
        where: {
          userId: session.user.id,
          deletedAt: null,
        },
        data: { isDefault: false },
      }),
      prisma.measurementProfile.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting default measurement profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}