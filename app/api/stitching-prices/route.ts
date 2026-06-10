import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const prices = await prisma.stitchingPrice.findMany({
      orderBy: { fabricType: "asc" },
    });

    // Group by gender: { male: { "shalwar kameez": 2500, ... }, female: { ... } }
    const grouped: Record<string, Record<string, number>> = {
      male: {},
      female: {},
    };

    for (const p of prices) {
      const genderKey = p.gender === "Female" ? "female" : "male";
      grouped[genderKey][p.fabricType.toLowerCase()] = Number(p.price);
    }

    return NextResponse.json(grouped);
  } catch (error) {
    console.error("Get stitching prices error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}