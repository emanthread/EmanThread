import { Suspense } from "react";
import { getFilteredProducts, getAllCategories, getDistinctColors } from "@/lib/db-queries";
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

  // Fetch initial data in parallel on the server
  const [data, categories, colors] = await Promise.all([
    getFilteredProducts({
      category,
      minPrice,
      maxPrice,
      sort,
      search,
      color,
      season,
      page: 1,
      limit: 20
    }),
    getAllCategories(),
    getDistinctColors(),
  ]);

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
        />
      </Suspense>
    </>
  );
}
