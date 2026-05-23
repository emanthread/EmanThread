import { NextResponse } from "next/server";
import { getDistinctColors } from "@/lib/db-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const colors = await getDistinctColors();
    return NextResponse.json(colors);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}