import { Suspense } from "react";
import type { Metadata } from "next";
import {
  CatalogPage,
  CatalogPageSkeleton,
  getCatalogPageMetadata,
} from "@/components/catalog/catalog-page";
import type { CatalogSearchParams } from "@/lib/db/catalog";

type ShopPageProps = { searchParams: Promise<CatalogSearchParams> };

export const revalidate = 300;

export async function generateMetadata({
  searchParams,
}: ShopPageProps): Promise<Metadata> {
  return getCatalogPageMetadata("/women", await searchParams, "/shop");
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const resolvedSearchParams = await searchParams;
  return (
    <Suspense fallback={<CatalogPageSkeleton />}>
      <CatalogPage
        canonicalPath="/women"
        routePath="/shop"
        showDepartmentHero={false}
        searchParams={resolvedSearchParams}
      />
    </Suspense>
  );
}
