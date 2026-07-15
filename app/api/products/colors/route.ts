import { NextResponse } from "next/server";
import { getDistinctColors } from "@/lib/db-queries";
import { sanitizeDbError } from '@/lib/utils/errors';

// Color list changes only when a new product color is added — cache for 2 min
export const revalidate = 120;

export async function GET() {
  try {
    const colors = await getDistinctColors();
    return NextResponse.json(colors);
  } catch (error) {
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
}