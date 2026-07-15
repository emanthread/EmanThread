import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Promo banner changes only when admin updates it — cache for 5 min
export const revalidate = 300;

const DEFAULT_PROMO_BANNER = {
  image: "/images/fabrics/promo_1776582682565.png",
  subtitle: "Limited Time Offer",
  title: "Summer Collection Sale",
  description:
    "Enjoy up to 30% off on our exclusive summer collection. Premium fabrics, unmatched quality - now at exceptional prices. Don't miss this opportunity to elevate your wardrobe.",
  stats: [
    { value: "30%", label: "Off Selected Items" },
    { value: "Free", label: "Shipping Over PKR 5,000" },
  ],
  cta: "Shop the Sale",
  link: "/shop?sale=true",
};

export async function GET() {
  try {
    const row = await prisma.storeConfig.findUnique({
      where: { key: "promo_banner" },
    });

    if (!row) {
      return NextResponse.json(DEFAULT_PROMO_BANNER);
    }

    try {
      const data = JSON.parse(row.value);
      if (data && typeof data === "object") {
        return NextResponse.json(data);
      }
      return NextResponse.json(DEFAULT_PROMO_BANNER);
    } catch {
      return NextResponse.json(DEFAULT_PROMO_BANNER);
    }
  } catch (error) {
    console.error("Get promo banner error:", error);
    return NextResponse.json(DEFAULT_PROMO_BANNER);
  }
}