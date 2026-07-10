import { NextResponse } from "next/server";
import { getStoreConfig } from "@/lib/db/store-config";
import { getDeliveryEstimate, getMonthCapacityMap } from "@/lib/db/stitching-schedule";

export const dynamic = "force-dynamic";

/**
 * GET /api/stitching/available-dates?month=2026-07
 *
 * Public endpoint — no authentication required.
 * Returns per-day availability for a given month so the checkout
 * calendar picker can grey out blocked / full / too-early dates.
 *
 * Response shape:
 * {
 *   "earliestDate": "2026-07-13",         -- minimum selectable date
 *   "days": {
 *     "2026-07-13": { available: true,  spotsLeft: 8,  blocked: false },
 *     "2026-07-14": { available: false, spotsLeft: 0,  blocked: false },
 *     "2026-07-15": { available: false, spotsLeft: 0,  blocked: true  }
 *   }
 * }
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // e.g. "2026-07"

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "month query param required, format: YYYY-MM" },
        { status: 400 }
      );
    }

    const config = await getStoreConfig();
    const threshold = config.stitchingDailyThreshold ?? 12;
    const leadDays = config.stitchingLeadDays ?? 6;

    // Get earliest allowed date (queue-based)
    const earliestDateObj = await getDeliveryEstimate(leadDays, threshold);
    const earliestDate = earliestDateObj.toISOString().slice(0, 10);

    // Get per-day capacity map for the requested month
    const capacityMap = await getMonthCapacityMap(month, threshold);

    // Build the response — mark each day as available/unavailable
    const days: Record<string, { available: boolean; spotsLeft: number; blocked: boolean }> = {};

    for (const [dateStr, info] of Object.entries(capacityMap)) {
      const isBeforeEarliest = dateStr < earliestDate;
      const blocked = info.blocked;
      const spotsLeft = info.capacity !== null ? Math.max(0, info.capacity - info.count) : 0;
      const available = !isBeforeEarliest && !blocked && spotsLeft > 0;

      days[dateStr] = { available, spotsLeft, blocked };
    }

    return NextResponse.json(
      { earliestDate, days },
      {
        headers: {
          // Short cache — slots fill up quickly
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=15",
        },
      }
    );
  } catch (error) {
    console.error("[available-dates] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
