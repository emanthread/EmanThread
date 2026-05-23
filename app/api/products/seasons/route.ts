import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SEASONS = [
  "Summer",
  "Winter",
  "Eid",
  "Festive",
  "All Season",
  "Casual",
  "Formal",
  "Wedding",
];

export async function GET() {
  return NextResponse.json(SEASONS);
}