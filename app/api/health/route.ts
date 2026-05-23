import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withGuard } from "@/lib/api-guards";
import { RateLimits } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

export const GET = withGuard(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ db: "connected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ db: "error", error: message }, { status: 500 });
  }
}, { rateLimit: RateLimits.public() });
