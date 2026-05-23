import { NextResponse } from "next/server";
import { getAllProducts, getFilteredProducts } from "@/lib/db-queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const hasFilters =
      searchParams.has("category") ||
      searchParams.has("minPrice") ||
      searchParams.has("maxPrice") ||
      searchParams.has("sort") ||
      searchParams.has("search") ||
      searchParams.has("color") ||
      searchParams.has("season");

    if (!hasFilters) {
      const products = await getAllProducts();
      return NextResponse.json(products, {
        headers: {
          // Cache product list for 5 min at CDN; serve stale for 10 min while revalidating
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    const category = searchParams.get("category") || undefined;
    const minPrice = searchParams.has("minPrice")
      ? Number(searchParams.get("minPrice"))
      : undefined;
    const maxPrice = searchParams.has("maxPrice")
      ? Number(searchParams.get("maxPrice"))
      : undefined;
    const sort =
      (searchParams.get("sort") as any) || undefined;
    const search = searchParams.get("search") || undefined;
    const color = searchParams.get("color") || undefined;
    const season = searchParams.get("season") || undefined;

    const products = await getFilteredProducts({
      category,
      minPrice,
      maxPrice,
      sort,
      search,
      color,
      season,
    });

    return NextResponse.json(products, {
      headers: {
        // Filtered results cached for 2 min (shorter — filter combos vary)
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}