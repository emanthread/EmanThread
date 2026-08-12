import { NextResponse } from "next/server";
import { getPublishedCatalogSidebarNavigation } from "@/lib/db/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const navigation = await getPublishedCatalogSidebarNavigation();
    return NextResponse.json(
      { paths: navigation.map((item) => item.path) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Get published catalog navigation error:", error);
    return NextResponse.json(
      { paths: [] },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
