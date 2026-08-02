import { NextResponse } from "next/server";
import {
  CATALOG_MAX_PAGE_SIZE,
  CATALOG_SORT_OPTIONS,
  getCatalogPageData,
  type CatalogSort,
} from "@/lib/db/catalog";
import { isShopCatalogPath } from "@/lib/shop-catalog-options";
import { sanitizeDbError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

function numberParam(value: string | null): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function integerParam(
  value: string | null,
  fallback: number,
  maximum: number
): number {
  const parsed = numberParam(value);
  if (!parsed || !Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

/**
 * The /shop catalog bridge uses only the additive ProductCatalogAssignment
 * table. Its separate endpoint prevents new department filtering from
 * changing the long-standing /api/products contract.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("catalogPath");
    if (!isShopCatalogPath(path)) {
      return NextResponse.json({ error: "Choose a valid catalog path" }, { status: 400 });
    }

    const requestedSort = searchParams.get("sort");
    const sort: CatalogSort = CATALOG_SORT_OPTIONS.includes(
      requestedSort as CatalogSort
    )
      ? (requestedSort as CatalogSort)
      : "featured";
    const categoryIds = (searchParams.get("category") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 25);

    const data = await getCatalogPageData(path, {
      page: integerParam(searchParams.get("page"), 1, 1_000),
      pageSize: integerParam(
        searchParams.get("limit"),
        20,
        CATALOG_MAX_PAGE_SIZE
      ),
      sort,
      search: searchParams.get("search") || undefined,
      categoryIds,
      minPrice: numberParam(searchParams.get("minPrice")),
      maxPrice: numberParam(searchParams.get("maxPrice")),
      color: searchParams.get("color") || undefined,
      season: searchParams.get("season") || undefined,
    });

    if (!data) {
      return NextResponse.json({ error: "Catalog path is not available" }, { status: 404 });
    }

    return NextResponse.json(
      {
        products: data.products,
        total: data.total,
        page: data.query.page,
        totalPages: data.totalPages,
        hasNextPage: data.hasNextPage,
      },
      {
        headers: {
          // Assignment changes should appear immediately during the staged
          // catalog rollout. This affects only the additive /shop bridge;
          // the established /api/products cache contract is unchanged.
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
