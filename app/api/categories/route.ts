import { NextResponse } from "next/server";
import { getAllCategories } from "@/lib/db-queries";
import { withGuard } from "@/lib/api-guards";
import { RateLimits } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

export const GET = withGuard(async () => {
  try {
    const categories = await getAllCategories();
    return NextResponse.json(categories, {
      headers: {
        // Categories rarely change — cache for 1 hour at CDN
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, { rateLimit: RateLimits.public() });