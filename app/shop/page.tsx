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

export default async function ShopPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  // Parse initial filters from URL (we only need these to determine the first 20 products)
  const category = typeof searchParams.category === "string" ? searchParams.category : undefined;
  const minPrice = typeof searchParams.minPrice === "string" ? Number(searchParams.minPrice) : undefined;
  const maxPrice = typeof searchParams.maxPrice === "string" ? Number(searchParams.maxPrice) : undefined;
  const sort = typeof searchParams.sort === "string" ? (searchParams.sort as any) : undefined;
  const search = typeof searchParams.search === "string" ? searchParams.search : undefined;
  const color = typeof searchParams.color === "string" ? searchParams.color : undefined;
  const season = typeof searchParams.season === "string" ? searchParams.season : undefined;

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
