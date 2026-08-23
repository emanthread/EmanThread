import { NextResponse } from "next/server";
import { getStoreConfig } from "@/lib/db/store-config";
import { getMonthCapacityMap } from "@/lib/db/stitching-schedule";
import { requireAdminApiAccess } from "@/lib/admin-route-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/stitching-calendar/capacity?month=2026-07
 *
 * Returns per-day capacity stats for the requested month.
 * Used by the admin calendar heat-map view.
 *
 * Response shape:
 * {
 *   "2026-07-01": { count: 0,  capacity: 12, blocked: false },
 *   "2026-07-15": { count: 8,  capacity: 12, blocked: false },
 *   "2026-07-19": { count: 12, capacity: 12, blocked: false },
 *   "2026-07-20": { count: 0,  capacity: null, blocked: true },
 *   ...
 * }
 */
export async function GET(req: Request) {
  const access = await requireAdminApiAccess(req);
  if (!access.ok) return access.response;

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // e.g. "2026-07"

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "month query param required, format: YYYY-MM" },
      { status: 400 }
    );
  }

  try {
    const config = await getStoreConfig();
    const threshold = config.stitchingDailyThreshold ?? 12;
    const map = await getMonthCapacityMap(month, threshold);
    return NextResponse.json({ month, threshold, days: map });
  } catch (error) {
    console.error("[stitching-calendar/capacity] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
