import { NextResponse } from "next/server";
import { getStoreConfig } from "@/lib/db/store-config";
import { getDeliveryEstimate } from "@/lib/db/stitching-schedule";

export const dynamic = "force-dynamic";

// Format a Date as "Saturday, 19 July 2026" in PKT locale
function formatDeliveryDate(date: Date): string {
  // Shift to PKT (UTC+5) for display
  const pktDate = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  return pktDate.toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });
}

/**
 * GET /api/stitching/delivery-estimate
 *
 * Public endpoint — no authentication required.
 * Returns the estimated stitching delivery date based on:
 *   - current order queue capacity
 *   - calendar rules (blocked dates, seasonal overrides)
 *   - configured lead days and daily threshold
 *
 * Used by the checkout page to show the customer their expected
 * delivery date BEFORE they place the order.
 */
export async function GET() {
  try {
    const config = await getStoreConfig();
    const threshold = config.stitchingDailyThreshold ?? 12;
    const leadDays = config.stitchingLeadDays ?? 6;

    const deliveryDate = await getDeliveryEstimate(leadDays, threshold);

    return NextResponse.json(
      {
        deliveryDate: deliveryDate.toISOString().slice(0, 10), // "2026-07-19"
        formatted: formatDeliveryDate(deliveryDate),           // "Saturday, 19 July 2026"
        leadDays,
        threshold,
      },
      {
        headers: {
          // Short cache — delivery slots fill up, so keep fresh
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    console.error("[delivery-estimate] Error:", error);
    // Graceful fallback: estimate without DB (orderDate + leadDays, no rules)
    const config = await getStoreConfig().catch(() => ({
      stitchingLeadDays: 6,
    }));
    const leadDays = (config as any).stitchingLeadDays ?? 6;
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + leadDays);
    return NextResponse.json({
      deliveryDate: fallback.toISOString().slice(0, 10),
      formatted: formatDeliveryDate(fallback),
      leadDays,
      threshold: 12,
      fallback: true,
    });
  }
}
