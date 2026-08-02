import { Suspense } from "react";
import { getFilteredProducts, getAllCategories, getDistinctColors } from "@/lib/db-queries";
import { getCatalogPageData, type CatalogSort } from "@/lib/db/catalog";
import { getActiveShopCatalogOptions } from "@/lib/db/shop-catalog-options";
import { isShopCatalogPath } from "@/lib/shop-catalog-options";
import { ShopContent } from "./shop-client";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://emaanthreads.com";

// Seasons are a fixed list — no DB call needed (mirrors /api/products/seasons)
const SEASONS = ["Summer", "Winter", "Eid", "Festive", "All Season", "Casual", "Formal", "Wedding"];

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": siteUrl,
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Shop",
      "item": `${siteUrl}/shop`,
    },
  ],
};

export const revalidate = 300;

type ShopSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ShopPage({ searchParams }: { searchParams: ShopSearchParams }) {
  const params = await searchParams;

  // Parse initial filters from URL (we only need these to determine the first 20 products)
  const category = typeof params.category === "string" ? params.category : undefined;
  const minPrice = typeof params.minPrice === "string" ? Number(params.minPrice) : undefined;
  const maxPrice = typeof params.maxPrice === "string" ? Number(params.maxPrice) : undefined;
  const sort = typeof params.sort === "string" ? (params.sort as any) : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;
  const color = typeof params.color === "string" ? params.color : undefined;
  const season = typeof params.season === "string" ? params.season : undefined;
  const requestedCatalogPath =
    typeof params.catalogPath === "string" && isShopCatalogPath(params.catalogPath)
      ? params.catalogPath
      : undefined;

  // Load the existing filters/options first. The legacy /shop query remains
  // the default; an explicit catalogPath switches only that request to the
  // additive assignment table.
  const [categories, colors, catalogOptions] = await Promise.all([
    getAllCategories(),
    getDistinctColors(),
    getActiveShopCatalogOptions(),
  ]);

  // Do not let an allow-listed-but-unpublished static path opt a shopper out
  // of the legacy listing. The client receives this same confirmed list.
  const confirmedCatalogPath =
    requestedCatalogPath &&
    catalogOptions.some((option) => option.path === requestedCatalogPath)
      ? requestedCatalogPath
      : undefined;

  // Pass raw values through to the catalog helper. It uses the same legacy
  // alias-to-fabricType resolver as /shop (for example, "wash-wear").
  const categoryIds = (category || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 25);

  const catalogSort: CatalogSort =
    sort === "newest" ||
    sort === "trending" ||
    sort === "price-asc" ||
    sort === "price-desc" ||
    sort === "name-asc"
      ? sort
      : "featured";

  const catalogData = confirmedCatalogPath
    ? await getCatalogPageData(confirmedCatalogPath, {
        categoryIds,
        minPrice,
        maxPrice,
        sort: catalogSort,
        search,
        color,
        season,
        page: 1,
        pageSize: 20,
      })
    : null;

  const data =
    catalogData ||
    (await getFilteredProducts({
      category,
      minPrice,
      maxPrice,
      sort,
      search,
      color,
      season,
      page: 1,
      limit: 20,
    }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <ShopContent 
          initialProducts={data.products} 
          initialCategories={categories}
          initialColors={colors}
          initialSeasons={SEASONS}
          catalogOptions={
            catalogData || !confirmedCatalogPath
              ? catalogOptions
              : catalogOptions.filter(
                  (option) => option.path !== confirmedCatalogPath
                )
          }
          initialCatalogPath={catalogData ? confirmedCatalogPath : undefined}
          initialHasMore={catalogData ? catalogData.hasNextPage : data.products.length === 20}
        />
      </Suspense>
    </>
  );
}
