import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CatalogPage,
  CatalogPageSkeleton,
  getCatalogPageMetadata,
} from "@/components/catalog/catalog-page";
import {
  buildCatalogPath,
  type CatalogSearchParams,
} from "@/lib/db/catalog";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

export type CatalogDepartment =
  | "women"
  | "men"
  | "fragrance-beauty"
  | "teens";

export interface CatalogRouteProps {
  params: Promise<{ catalogPath?: string[] }>;
  searchParams: Promise<CatalogSearchParams>;
}

export async function generateDepartmentCatalogMetadata(
  department: CatalogDepartment,
  { params, searchParams }: CatalogRouteProps
): Promise<Metadata> {
  const [{ catalogPath }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const canonicalPath = buildCatalogPath(department, catalogPath);

  return getCatalogPageMetadata(canonicalPath, resolvedSearchParams);
}

export async function renderDepartmentCatalogPage(
  department: CatalogDepartment,
  { params, searchParams }: CatalogRouteProps
) {
  if (!FEATURE_FLAGS.CATALOG_PAGES_V1) {
    notFound();
  }

  const [{ catalogPath }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const canonicalPath = buildCatalogPath(department, catalogPath);

  if (!canonicalPath) notFound();

  const isDepartmentRoot = !catalogPath || catalogPath.length === 0;

  return (
    <Suspense fallback={<CatalogPageSkeleton isDepartmentRoot={isDepartmentRoot} />}>
      <CatalogPage
        canonicalPath={canonicalPath}
        searchParams={resolvedSearchParams}
      />
    </Suspense>
  );
}
