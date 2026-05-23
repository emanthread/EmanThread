import { NextResponse } from "next/server";
import { getStoreConfig } from "@/lib/db-queries";
import { withGuard } from "@/lib/api-guards";
import { RateLimits } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

export const GET = withGuard(async () => {
  try {
    const config = await getStoreConfig();

    return NextResponse.json({
      name: config.name,
      tagline: config.tagline,
      email: config.email,
      phone: config.phone,
      whatsappNumber: config.whatsappNumber,
      address: config.address,
      currency: config.currency,
      timezone: config.timezone,
      freeShippingThreshold: config.freeShippingThreshold,
      standardShippingRate: config.standardShippingRate,
      expressShippingRate: config.expressShippingRate,
      enableCOD: config.enableCOD,
    }, {
      headers: {
        // Store config changes infrequently — cache 10 min, stale for 20 min
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    });
  } catch (error) {
    console.error("Get public store config error:", error);
    return NextResponse.json(
      { error: "Failed to load store configuration" },
      { status: 500 }
    );
  }
}, { rateLimit: RateLimits.public() });