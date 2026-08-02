import { NextResponse } from "next/server";
import { DEFAULT_HERO_SLIDES, getHeroSlides } from "@/lib/db/store-config";

// Cache for 5 min — matches the Cache-Control header set in next.config.mjs
export const revalidate = 300;

export async function GET() {
  try {
    return NextResponse.json(await getHeroSlides());
  } catch (error) {
    console.error("Get hero slides error:", error);
    return NextResponse.json(DEFAULT_HERO_SLIDES);
  }
}
