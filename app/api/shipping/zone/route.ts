import { NextResponse } from "next/server";
import { z } from "zod";
import { getZoneForCity } from "@/lib/db-queries";
import { sanitizeDbError } from '@/lib/utils/errors';

// Cache for 10 min, serve stale for 30 min while revalidating
export const revalidate = 600;

const querySchema = z.object({
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "Province is required"),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city") || "";
    const province = searchParams.get("province") || "";

    const result = querySchema.safeParse({ city, province });
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const zone = await getZoneForCity(city, province);

    return NextResponse.json({
      zone: {
        id: zone.id,
        name: zone.name,
        shippingRate: zone.shippingRate,
        estimatedDays: zone.estimatedDays,
      },
    });
  } catch (error) {
    console.error("Get shipping zone error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
}