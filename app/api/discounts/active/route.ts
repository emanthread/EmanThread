import { NextResponse } from "next/server";
import { getActiveDiscounts } from "@/lib/db-queries";

export const dynamic = "force-dynamic";

/**
 * Public endpoint: returns currently active discounts.
 * No auth required — used by storefront for flash sale banners / countdowns.
 */
export async function GET() {
  try {
    const discounts = await getActiveDiscounts();

    // Strip internal fields from public response
    const publicDiscounts = discounts.map((d) => ({
      id: d.id,
      code: d.code,
      type: d.type,
      value: d.value,
      buyQuantity: d.buyQuantity,
      getQuantity: d.getQuantity,
      minPurchase: d.minPurchase,
      maxDiscount: d.maxDiscount,
      endDate: d.endDate,
    }));

    return NextResponse.json({ discounts: publicDiscounts });
  } catch (error) {
    console.error("Get active discounts error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}