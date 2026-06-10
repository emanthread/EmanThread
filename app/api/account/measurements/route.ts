import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireAuth, guardErrorResponse } from "@/lib/api-guards";
import { validateCsrf } from "@/lib/csrf";

async function getSessionUser() {
  try {
    const session = await requireAuth();
    return session.user;
  } catch (err) {
    return guardErrorResponse(err);
  }
}

/**
 * GET /api/account/measurements
 * List measurement profiles for the authenticated user
 */
export async function GET(_request: NextRequest) {
  const user = await getSessionUser();
  if (user instanceof NextResponse) return user;

  try {
    const profiles = await prisma.measurementProfile.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("GET measurement profiles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch measurement profiles" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/account/measurements
 * Create a new measurement profile with basic info.
 * For full measurement field creation, use POST /api/measurements instead.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (user instanceof NextResponse) return user;

  try {
    await validateCsrf(request);
    const body = await request.json();
    const { name, category, garmentType } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: "Name and category are required." },
        { status: 400 },
      );
    }

    const gender = category.startsWith("Men") || category.startsWith("Shirt") || category.startsWith("Prince") || category.startsWith("Simple")
      ? "Male"
      : "Female";

    // Map legacy category names to garmentType if not explicitly provided
    const resolvedGarmentType = garmentType || mapCategoryToGarmentType(category, gender);

    const profile = await prisma.measurementProfile.create({
      data: {
        userId: user.id,
        profileName: name,
        gender,
        garmentType: resolvedGarmentType,
        source: "profile",
      },
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    // CSRF validation failure — return 403, not 500
    if (error instanceof Error && error.message === "CSRF validation failed") {
      return NextResponse.json(
        { error: "Forbidden: invalid CSRF token" },
        { status: 403 },
      );
    }

    // Prisma known errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2022") {
        console.error("P2022: Column missing in account/measurements POST:", error.meta);
        return NextResponse.json({ error: "Database schema mismatch. Contact support." }, { status: 500 });
      }
      console.error(`Prisma error ${error.code}:`, error.meta);
      return NextResponse.json({ error: `Database error (${error.code}). Please try again.` }, { status: 500 });
    }

    console.error("POST measurement profile error:", error);
    return NextResponse.json(
      { error: "Failed to create measurement profile. Please try again." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/account/measurements?id=...
 * Delete a measurement profile
 */
export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (user instanceof NextResponse) return user;

  try {
    await validateCsrf(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Profile id is required." }, { status: 400 });
    }

    await prisma.measurementProfile.deleteMany({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // CSRF validation failure — return 403, not 500
    if (error instanceof Error && error.message === "CSRF validation failed") {
      return NextResponse.json(
        { error: "Forbidden: invalid CSRF token" },
        { status: 403 },
      );
    }

    // Prisma known errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2022") {
        console.error("P2022: Column missing in account/measurements DELETE:", error.meta);
        return NextResponse.json({ error: "Database schema mismatch. Contact support." }, { status: 500 });
      }
      console.error(`Prisma error ${error.code}:`, error.meta);
      return NextResponse.json({ error: `Database error (${error.code}).` }, { status: 500 });
    }

    console.error("DELETE measurement profile error:", error);
    return NextResponse.json(
      { error: "Failed to delete measurement profile." },
      { status: 500 },
    );
  }
}

/**
 * Map legacy "category" strings to garmentType values.
 * This allows older client code that sends "Men Shalwar Kameez" etc.
 * to still create properly typed measurement profiles.
 */
function mapCategoryToGarmentType(category: string, gender: string): string {
  const normalized = category.trim().toLowerCase();

  if (gender === "Male") {
    if (normalized.includes("shalwar")) return "male_shalwar_kameez";
    if (normalized.includes("3 piece") || normalized.includes("simple")) return "male_simple_3_piece";
    if (normalized.includes("prince")) return "male_prince_coat";
    if (normalized.includes("shirt")) return "male_shirt";
    return "male_shalwar_kameez";
  }

  if (normalized.includes("simple shalwar") || normalized.includes("shalwar kameez")) return "female_simple_shalwar";
  if (normalized.includes("frock")) return "female_frock";
  if (normalized.includes("saari") || normalized.includes("sari")) return "female_saari";
  if (normalized.includes("lehnga") || normalized.includes("kurti")) return "female_lehnga_kurti";
  return "female_simple_shalwar";
}