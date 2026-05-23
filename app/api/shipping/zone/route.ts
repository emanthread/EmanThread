import { NextResponse } from "next/server";
import { z } from "zod";
import { getZoneForCity } from "@/lib/db-queries";

export const dynamic = "force-dynamic";

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
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}