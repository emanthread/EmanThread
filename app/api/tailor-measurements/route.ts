import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { unifiedMeasurementRequestSchema } from "@/lib/validators/measurements-unified";

export const dynamic = "force-dynamic";

// GET → returns the current user's tailor measurement (read-only for user)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const measurement = await prisma.measurementProfile.findFirst({
    where: {
      userId: session.user.id,
      source: "tailor_request",
      deletedAt: null,
    },
  });
  return NextResponse.json({ measurement });
}

// POST → creates a measurement request (source: "tailor_request", status: "pending")
// Only one active tailor request per user at a time
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if a tailor request already exists (active, not soft-deleted)
  const existing = await prisma.measurementProfile.findFirst({
    where: {
      userId: session.user.id,
      source: "tailor_request",
      deletedAt: null,
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Measurement request already exists. Contact admin to update." },
      { status: 409 }
    );
  }

  const body = await req.json();
  const parsed = unifiedMeasurementRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Build notes with structured profile info if a profile was selected
  let finalNotes = parsed.data.notes ?? "";
  if (parsed.data.selectedProfileId && parsed.data.selectedProfileName) {
    const profileTag = `[Profile: ${parsed.data.selectedProfileName}|${parsed.data.selectedProfileId}]`;
    finalNotes = finalNotes ? `${profileTag}\n${finalNotes}` : profileTag;
  }

  const measurement = await prisma.measurementProfile.create({
    data: {
      userId: session.user.id,
      gender: parsed.data.gender,
      garmentType: parsed.data.garmentType,
      notes: finalNotes,
      source: "tailor_request",
      status: "pending",
      requestedAt: new Date(),
    },
  });

  return NextResponse.json({ measurement }, { status: 201 });
}