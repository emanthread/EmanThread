import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isDepartmentListingRequest, retiredWomenRootDestination } from "@/lib/navigation/storefront-routes";
import type { Metadata } from "next";
import {
  CatalogPage,
  CatalogPageSkeleton,
  getCatalogPageMetadata,
} from "@/components/catalog/catalog-page";
import type { CatalogSearchParams } from "@/lib/db/catalog";

type ShopPageProps = { searchParams: Promise<CatalogSearchParams> };

export const revalidate = 0;

export async function generateMetadata({
  searchParams,
}: ShopPageProps): Promise<Metadata> {
  return getCatalogPageMetadata("/women", await searchParams, "/shop");
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const resolvedSearchParams = await searchParams;
  if (!isDepartmentListingRequest(resolvedSearchParams)) {
    redirect(retiredWomenRootDestination(resolvedSearchParams));
  }
  return (
    <Suspense fallback={<CatalogPageSkeleton />}>
      <CatalogPage
        canonicalPath="/women"
        routePath="/shop"
        searchParams={resolvedSearchParams}
      />
    </Suspense>
  );
}
