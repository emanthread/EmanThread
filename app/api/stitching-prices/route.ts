import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const prices = await prisma.stitchingPrice.findMany({
      orderBy: { fabricType: "asc" },
    });

    // Return as a simple map: { "Cotton": 2500, "Wash & Wear": 2500, ... }
    const priceMap: Record<string, number> = {};
    for (const p of prices) {
      priceMap[p.fabricType] = Number(p.price);
    }

    return NextResponse.json(priceMap);
  } catch (error) {
    console.error("Get stitching prices error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}