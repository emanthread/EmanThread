import { NextResponse } from "next/server";
import { getAllProducts, getFilteredProducts } from "@/lib/db-queries";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category") || undefined;
    const minPrice = searchParams.has("minPrice")
      ? Number(searchParams.get("minPrice"))
      : undefined;
    const maxPrice = searchParams.has("maxPrice")
      ? Number(searchParams.get("maxPrice"))
      : undefined;
    const sort = (searchParams.get("sort") as any) || undefined;
    const search = searchParams.get("search") || undefined;
    const color = searchParams.get("color") || undefined;
    const season = searchParams.get("season") || undefined;
    const page = searchParams.has("page") ? Number(searchParams.get("page")) : 1;
    const limit = searchParams.has("limit") ? Number(searchParams.get("limit")) : 20;

    const data = await getFilteredProducts({
      category,
      minPrice,
      maxPrice,
      sort,
      search,
      color,
      season,
      page,
      limit
    });

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
}