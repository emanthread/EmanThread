import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { unifiedMeasurementRequestSchema } from "@/lib/validators/measurements-unified";

export const dynamic = "force-dynamic";

// GET → returns the current user's tailor measurement (read-only for user)
export async function GET() {
  try {
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
  } catch (error) {
    console.error("Get tailor measurement error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST → creates a measurement request (source: "tailor_request", status: "pending")
// Only one active tailor request per user at a time
export async function POST(req: NextRequest) {
  try {
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
  let sourceProfileId: string | null = null;

  // If the user selected an existing profile, copy its measurement fields
  let profileFields: Record<string, string> = {};
  if (parsed.data.selectedProfileId) {
    const sourceProfile = await prisma.measurementProfile.findFirst({
      where: {
        id: parsed.data.selectedProfileId,
        userId: session.user.id,
        deletedAt: null,
      },
    });
    if (sourceProfile) {
      sourceProfileId = sourceProfile.id;
      // List of all measurement field names from the schema (excluding meta fields)
      const fieldNames = [
        "length1", "length2", "shoulder1", "shoulder2",
        "chest1", "chest2", "waist1", "waist2",
        "gherra1", "gherra2", "neck1", "neck2",
        "sleeves1", "sleeves2", "golai1", "golai2",
        "armcuff1", "armcuff2", "armplate1", "armplate2",
        "golbazoo1", "golbazoo2", "armpatti1", "armpatti2",
        "collarnok1", "collarnok2", "bane1", "bane2",
        "ladHip1", "ladHip2", "hip1", "hip2",
        "doubleCb", "singleCb", "golCb", "chorasCb",
        "baneCb", "collarCb", "roundneck",
        "frontPocket", "sidePocket", "shalwarPocket",
        "shalwar1", "shalwar2", "shalwarGherra1", "shalwarGherra2",
        "shalwarAssan1", "shalwarAssan2", "shalwarPancha1", "shalwarPancha2",
        "trouserdata1", "trouserdata2", "trouserdata3", "trouserdata4",
        "trouserdata5", "trouserdata6", "trouserdata7", "trouserdata8",
        "trouserdata9", "trouserdata10", "trouserdata11", "trouserdata12",
        "trouserdata13", "trouserdata14",
        "ladGolai1", "ladGolai2", "ladMori1", "ladMori2",
        "ladBellbazoo1", "ladBellbazoo2", "ladChaak1", "ladChaak2",
        "ladSimpleShalwar1", "ladSimpleShalwar2",
        "ladSimpleShalwarPancha1", "ladSimpleShalwarPancha2",
        "ladSimpleShalwarGherra1", "ladSimpleShalwarGherra2",
        "ladLasticSimpleShalwar",
        "ladShalwarBelt1", "ladShalwarBelt2",
        "ladShalwarBeltPancha1", "ladShalwarBeltPancha2",
        "ladShalwarBeltGherra1", "ladShalwarBeltGherra2",
        "ladLasticShalwarBelt",
        "ladTrouserdata15", "ladTrouserdata16",
      ];
      for (const fn of fieldNames) {
        const val = (sourceProfile as any)[fn];
        if (val !== undefined && val !== null && val !== "") {
          profileFields[fn] = String(val);
        }
      }
      const profileTag = `[Profile: ${sourceProfile.profileName || parsed.data.selectedProfileName}|${sourceProfile.id}]`;
      finalNotes = finalNotes ? `${profileTag}\n${finalNotes}` : profileTag;
    } else if (parsed.data.selectedProfileName) {
      const profileTag = `[Profile: ${parsed.data.selectedProfileName}|${parsed.data.selectedProfileId}]`;
      finalNotes = finalNotes ? `${profileTag}\n${finalNotes}` : profileTag;
    }
  }

  const measurement = await prisma.measurementProfile.create({
    data: {
      userId: session.user.id,
      gender: parsed.data.gender,
      garmentType: parsed.data.garmentType,
      notes: finalNotes,
      source: "tailor_request",
      profileName: sourceProfileId ? `Tailor_${sourceProfileId.slice(0, 8)}` : `Tailor_Request`,
      ...profileFields,
    },
  });

  return NextResponse.json({ measurement }, { status: 201 });
  } catch (error) {
    console.error("Create tailor measurement error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}