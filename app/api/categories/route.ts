import { NextResponse } from "next/server";
import { getAllCategories } from "@/lib/db-queries";
import { withGuard } from "@/lib/api-guards";
import { RateLimits } from "@/lib/rate-limiter";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

export const GET = withGuard(async () => {
  try {
    const categories = await getAllCategories();
    return NextResponse.json(categories, {
      headers: {
        // Short cache so stale categories never linger after a deploy
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
}, { rateLimit: RateLimits.public() });