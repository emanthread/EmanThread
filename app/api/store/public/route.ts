import { NextResponse } from "next/server";
import { getStoreConfig } from "@/lib/db-queries";
import { withGuard } from "@/lib/api-guards";
import { RateLimits } from "@/lib/rate-limiter";

// Store config is near-static — cache for 5 min, serve stale for 10 min while revalidating
export const dynamic = "force-dynamic";

export const GET = withGuard(async () => {
  try {
    const config = await getStoreConfig();

    return NextResponse.json(
      {
        name: config.name,
        tagline: config.tagline,
        email: config.email,
        phone: config.phone,
        whatsappNumber: config.whatsappNumber,
        address: config.address,
        currency: config.currency,
        timezone: config.timezone,
        freeShippingThreshold: config.freeShippingThreshold,
        enableFreeShipping: config.enableFreeShipping,
        standardShippingRate: config.standardShippingRate,
        expressShippingRate: config.expressShippingRate,
        enableCOD: config.enableCOD,
        stitchingNotice: config.stitchingNotice,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Get public store config error:", error);
    return NextResponse.json(
      { error: "Failed to load store configuration" },
      { status: 500 }
    );
  }
}, { rateLimit: RateLimits.public() });
