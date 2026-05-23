import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron endpoint to auto-activate/deactivate scheduled discounts.
 * Triggered every 5 minutes via vercel.json crons config.
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("Authorization");
    const expected = `Bearer ${process.env.CRON_SECRET}`;
    if (!process.env.CRON_SECRET || authHeader !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Activate: startDate <= now, isActive = false, startDate not null
    const activateResult = await prisma.discount.updateMany({
      where: {
        isActive: false,
        startDate: { not: null, lte: now },
        endDate: { gte: now },
      },
      data: { isActive: true },
    });

    // Deactivate: endDate < now, isActive = true
    const deactivateResult = await prisma.discount.updateMany({
      where: {
        isActive: true,
        endDate: { not: null, lt: now },
      },
      data: { isActive: false },
    });

    return NextResponse.json({
      activated: activateResult.count,
      deactivated: deactivateResult.count,
      checkedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Flash sales cron error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Also support POST in case Vercel changes the method
export const POST = GET;