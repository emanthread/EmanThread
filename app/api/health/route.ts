import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withGuard } from "@/lib/api-guards";
import { RateLimits } from "@/lib/rate-limiter";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

export const GET = withGuard(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ db: "connected" });
  } catch (error) {
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ db: "error", error: message }, { status });
  }
}, { rateLimit: RateLimits.public() });
