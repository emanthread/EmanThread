import { NextResponse } from "next/server";
import { getDistinctColors } from "@/lib/db-queries";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const colors = await getDistinctColors();
    return NextResponse.json(colors);
  } catch (error) {
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
}