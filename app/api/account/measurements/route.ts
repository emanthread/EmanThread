import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateUser } from "@/lib/api-guards";

/**
 * GET /api/account/measurements
 * List measurement profiles for the authenticated user
 */
export async function GET(request: NextRequest) {
  const user = await validateUser(request);
  if (user instanceof NextResponse) return user;

  try {
    const profiles = await db.measurementProfile.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
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
 * Create a new measurement profile
 */
export async function POST(request: NextRequest) {
  const user = await validateUser(request);
  if (user instanceof NextResponse) return user;

  try {
    const body = await request.json();
    const { name, category } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: "Name and category are required." },
        { status: 400 },
      );
    }

    const profile = await db.measurementProfile.create({
      data: {
        userId: user.id,
        profileName: name,
        category,
        gender: category.startsWith("Men") || category.startsWith("Shirt") || category.startsWith("Prince") || category.startsWith("Simple")
          ? "Male"
          : "Female",
        source: "manual", // User manual entry
      },
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
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
  const user = await validateUser(request);
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Profile id is required." }, { status: 400 });
    }

    await db.measurementProfile.deleteMany({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE measurement profile error:", error);
    return NextResponse.json(
      { error: "Failed to delete measurement profile." },
      { status: 500 },
    );
  }
}