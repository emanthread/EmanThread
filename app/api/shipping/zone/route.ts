import { NextResponse } from "next/server";
import { z } from "zod";
import { getShippingQuote } from "@/lib/db-queries";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

const querySchema = z.object({
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "Province is required"),
  subtotal: z.coerce.number().finite().nonnegative("Subtotal must be non-negative"),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city") || "";
    const province = searchParams.get("province") || "";
    const subtotal = searchParams.get("subtotal") || "";

    const result = querySchema.safeParse({ city, province, subtotal });
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const quote = await getShippingQuote(result.data);

    return NextResponse.json(
      { quote },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Get shipping zone error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
