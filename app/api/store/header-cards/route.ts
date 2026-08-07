import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import {
  CATALOG_HEADER_CARDS_KEY,
  EMPTY_CATALOG_HEADER_CARD_CONFIG,
  parseCatalogHeaderCardConfig,
} from "@/lib/navigation/catalog-header-cards";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const row = await prisma.storeConfig.findUnique({
      where: { key: CATALOG_HEADER_CARDS_KEY },
    });
    const config = row
      ? parseCatalogHeaderCardConfig(JSON.parse(row.value))
      : EMPTY_CATALOG_HEADER_CARD_CONFIG;

    return NextResponse.json(config, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("Get public catalog header cards error:", error);
    // Header navigation must remain usable if customization data is missing,
    // malformed, or temporarily unavailable.
    return NextResponse.json(EMPTY_CATALOG_HEADER_CARD_CONFIG, {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
