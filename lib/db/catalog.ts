import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Product } from "@/lib/data";
import {
  parseJsonArray,
  parseProductImages,
} from "@/lib/utils/parse-images";

export const CATALOG_PAGE_SIZE = 24;
export const CATALOG_MAX_PAGE_SIZE = 48;
export const CATALOG_MAX_PAGE = 1_000;

export const CATALOG_SORT_OPTIONS = [
  "featured",
  "newest",
  "price-asc",
  "price-desc",
  "name-asc",
] as const;

export type CatalogSort = (typeof CATALOG_SORT_OPTIONS)[number];

export type CatalogSearchParams = Record<
  string,
  string | string[] | undefined
>;

export interface CatalogQueryInput {
  page?: number;
  pageSize?: number;
  sort?: CatalogSort;
  search?: string;
  fabricType?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export interface CatalogBreadcrumb {
  id: string;
  label: string;
  path: string;
}

export interface CatalogFeaturedItem {
  title: string | null;
  description: string | null;
  image: string | null;
  imageAlt: string | null;
  href: string | null;
  ctaLabel: string | null;
}

export interface ResolvedCatalogNode {
  id: string;
  parentId: string | null;
  nodeType: string;
  label: string;
  slug: string;
  path: string;
  description: string | null;
  bannerImage: string | null;
  bannerAlt: string | null;
  featuredContent: CatalogFeaturedItem[];
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalOverride: string | null;
  indexable: boolean;
  displayOrder: number;
  breadcrumbs: CatalogBreadcrumb[];
}

export interface CatalogPageData {
  node: ResolvedCatalogNode;
  products: Product[];
  query: Required<
    Pick<CatalogQueryInput, "page" | "pageSize" | "sort">
  > &
    Omit<CatalogQueryInput, "page" | "pageSize" | "sort">;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

const catalogNodeSelect = {
  id: true,
  parentId: true,
  nodeType: true,
  label: true,
  slug: true,
  path: true,
  description: true,
  bannerImage: true,
  bannerAlt: true,
  featuredContent: true,
  seoTitle: true,
  seoDescription: true,
  canonicalOverride: true,
  indexable: true,
  displayOrder: true,
} satisfies Prisma.CatalogNodeSelect;

type CatalogNodeRecord = Prisma.CatalogNodeGetPayload<{
  select: typeof catalogNodeSelect;
}>;

type CatalogAssignmentWithProduct =
  Prisma.ProductCatalogAssignmentGetPayload<{
    include: { product: true };
  }>;

type CatalogAncestorRow = CatalogBreadcrumb & {
  parentId: string | null;
  isActive: boolean;
  isVisible: boolean;
  depth: number;
};

const productBadgeMap: Record<string, Product["badge"]> = {
  NEW: "New",
  TRENDING: "Trending",
  HOT: "Hot",
  LIMITED: "Limited",
  FEATURED: "Featured",
};

function firstParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function boundedText(
  value: string | string[] | undefined,
  maxLength: number
): string | undefined {
  const text = firstParam(value)?.trim();
  return text ? text.slice(0, maxLength) : undefined;
}

function finiteNumber(
  value: string | string[] | undefined
): number | undefined {
  const raw = firstParam(value);
  if (!raw) return undefined;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function positiveInteger(
  value: string | string[] | undefined,
  fallback: number,
  maximum = CATALOG_MAX_PAGE
): number {
  const parsed = finiteNumber(value);
  if (
    parsed === undefined ||
    !Number.isSafeInteger(parsed) ||
    parsed < 1
  ) {
    return fallback;
  }
  return Math.min(maximum, parsed);
}

function normalizeQuery(input: CatalogQueryInput): CatalogPageData["query"] {
  const requestedPage =
    Number.isSafeInteger(input.page) && (input.page ?? 0) > 0
      ? (input.page as number)
      : 1;
  const page = Math.min(CATALOG_MAX_PAGE, requestedPage);
  const pageSize = Math.min(
    CATALOG_MAX_PAGE_SIZE,
    Math.max(1, Math.floor(input.pageSize || CATALOG_PAGE_SIZE))
  );
  const sort = CATALOG_SORT_OPTIONS.includes(input.sort as CatalogSort)
    ? (input.sort as CatalogSort)
    : "featured";
  const minPrice =
    input.minPrice !== undefined && Number.isFinite(input.minPrice)
      ? Math.max(0, input.minPrice)
      : undefined;
  const maxPrice =
    input.maxPrice !== undefined && Number.isFinite(input.maxPrice)
      ? Math.max(0, input.maxPrice)
      : undefined;

  return {
    page,
    pageSize,
    sort,
    search: input.search?.trim().slice(0, 100) || undefined,
    fabricType: input.fabricType?.trim().slice(0, 80) || undefined,
    color: input.color?.trim().slice(0, 80) || undefined,
    minPrice,
    maxPrice,
    inStock: input.inStock,
  };
}

/**
 * Parse catalog-only URL parameters. These names are deliberately independent
 * of /shop so the legacy listing contract remains untouched.
 */
export function parseCatalogSearchParams(
  params: CatalogSearchParams
): CatalogPageData["query"] {
  const requestedSort = firstParam(params.sort);
  const sort = CATALOG_SORT_OPTIONS.includes(requestedSort as CatalogSort)
    ? (requestedSort as CatalogSort)
    : "featured";
  const inStock = firstParam(params.inStock);

  return normalizeQuery({
    page: positiveInteger(params.page, 1),
    pageSize: CATALOG_PAGE_SIZE,
    sort,
    search: boundedText(params.q, 100),
    fabricType: boundedText(params.fabric, 80),
    color: boundedText(params.color, 80),
    minPrice: finiteNumber(params.minPrice),
    maxPrice: finiteNumber(params.maxPrice),
    inStock:
      inStock === "true" || inStock === "1" ? true : undefined,
  });
}

export function hasCatalogQueryParams(params: CatalogSearchParams): boolean {
  return Object.values(params).some((value) =>
    Array.isArray(value)
      ? value.some((item) => item.trim().length > 0)
      : typeof value === "string" && value.trim().length > 0
  );
}

/**
 * Route segments must already be approved canonical slugs. No label
 * slugification or /shop mapping happens here.
 */
export function buildCatalogPath(
  department: "women" | "men" | "fragrance-beauty" | "teens",
  segments: string[] | undefined
): string | null {
  const allSegments = [department, ...(segments || [])];
  const isCanonical = allSegments.every((segment) =>
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(segment)
  );

  return isCanonical ? `/${allSegments.join("/")}` : null;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 2_000)
    : null;
}

function normalizeFeaturedItem(value: unknown): CatalogFeaturedItem | null {
  if (typeof value === "string") {
    return {
      title: null,
      description: nullableString(value),
      image: null,
      imageAlt: null,
      href: null,
      ctaLabel: null,
    };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const item = value as Record<string, unknown>;
  const normalized = {
    title: nullableString(item.title),
    description: nullableString(item.description),
    image: nullableString(item.image),
    imageAlt: nullableString(item.imageAlt ?? item.alt),
    href: nullableString(item.href),
    ctaLabel: nullableString(item.ctaLabel ?? item.linkLabel),
  };

  return Object.values(normalized).some(Boolean) ? normalized : null;
}

function normalizeFeaturedContent(value: unknown): CatalogFeaturedItem[] {
  let items: unknown[];

  if (Array.isArray(value)) {
    items = value;
  } else if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Array.isArray((value as Record<string, unknown>).items)
  ) {
    items = (value as { items: unknown[] }).items;
  } else if (value === null || value === undefined) {
    items = [];
  } else {
    items = [value];
  }

  return items
    .map(normalizeFeaturedItem)
    .filter((item): item is CatalogFeaturedItem => item !== null)
    .slice(0, 6);
}

async function loadCatalogBreadcrumbs(
  catalogNodeId: string
): Promise<CatalogAncestorRow[]> {
  return prisma.$queryRaw<CatalogAncestorRow[]>`
    WITH RECURSIVE "CatalogAncestors" AS (
      SELECT
        "id",
        "parentId",
        "label",
        "path",
        "isActive",
        "isVisible",
        0 AS "depth",
        ARRAY["id"]::TEXT[] AS "visited"
      FROM "CatalogNode"
      WHERE "id" = ${catalogNodeId}

      UNION ALL

      SELECT
        parent."id",
        parent."parentId",
        parent."label",
        parent."path",
        parent."isActive",
        parent."isVisible",
        child."depth" + 1,
        child."visited" || parent."id"
      FROM "CatalogNode" AS parent
      INNER JOIN "CatalogAncestors" AS child
        ON child."parentId" = parent."id"
      WHERE
        child."depth" < 15
        AND NOT parent."id" = ANY(child."visited")
    )
    SELECT
      "id",
      "parentId",
      "label",
      "path",
      "isActive",
      "isVisible",
      "depth"
    FROM "CatalogAncestors"
    ORDER BY "depth" DESC
  `;
}

async function resolveActiveCatalogNodeUncached(
  canonicalPath: string
): Promise<ResolvedCatalogNode | null> {
  if (
    !canonicalPath.startsWith("/") ||
    canonicalPath.endsWith("/") ||
    canonicalPath.includes("//")
  ) {
    return null;
  }

  const node = await prisma.catalogNode.findFirst({
    where: {
      path: canonicalPath,
      isActive: true,
      isVisible: true,
    },
    select: catalogNodeSelect,
  });

  if (!node) return null;

  const ancestors = await loadCatalogBreadcrumbs(node.id);
  const hasCompleteVisibleHierarchy =
    ancestors.length > 0 &&
    ancestors[ancestors.length - 1]?.id === node.id &&
    ancestors.every((ancestor) => ancestor.isActive && ancestor.isVisible);

  if (!hasCompleteVisibleHierarchy) return null;

  return mapCatalogNode(node, ancestors);
}

function mapCatalogNode(
  node: CatalogNodeRecord,
  ancestors: CatalogAncestorRow[]
): ResolvedCatalogNode {
  return {
    ...node,
    featuredContent: normalizeFeaturedContent(node.featuredContent),
    breadcrumbs: ancestors.map(({ id, label, path }) => ({
      id,
      label,
      path,
    })),
  };
}

/**
 * Resolve one active, visible canonical node and its full breadcrumb hierarchy.
 * React cache deduplicates metadata/page lookups within the same request.
 */
export const resolveActiveCatalogNode = cache(
  resolveActiveCatalogNodeUncached
);

function productWhereForCatalog(
  query: CatalogPageData["query"]
): Prisma.ProductWhereInput {
  const price: Prisma.DecimalFilter | undefined =
    query.minPrice !== undefined || query.maxPrice !== undefined
      ? {
          ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
          ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
        }
      : undefined;

  return {
    ...(query.search
      ? {
          OR: [
            {
              name: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
            {
              sku: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
            {
              description: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
    ...(query.fabricType
      ? {
          fabricType: {
            equals: query.fabricType,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(query.color
      ? {
          color: {
            equals: query.color,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(price ? { price } : {}),
    ...(query.inStock === true ? { inStock: true } : {}),
  };
}

function assignmentOrderBy(
  sort: CatalogSort
): Prisma.ProductCatalogAssignmentOrderByWithRelationInput[] {
  const stableIdOrder: Prisma.ProductCatalogAssignmentOrderByWithRelationInput =
    { id: "asc" };

  switch (sort) {
    case "newest":
      return [{ product: { createdAt: "desc" } }, stableIdOrder];
    case "price-asc":
      return [
        { product: { price: "asc" } },
        { product: { createdAt: "desc" } },
        stableIdOrder,
      ];
    case "price-desc":
      return [
        { product: { price: "desc" } },
        { product: { createdAt: "desc" } },
        stableIdOrder,
      ];
    case "name-asc":
      return [{ product: { name: "asc" } }, stableIdOrder];
    case "featured":
    default:
      return [
        { isFeatured: "desc" },
        { displayOrder: { sort: "asc", nulls: "last" } },
        { product: { createdAt: "desc" } },
        stableIdOrder,
      ];
  }
}

function transformCatalogProduct(
  assignment: CatalogAssignmentWithProduct
): Product {
  const product = assignment.product;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug || undefined,
    price: Number(product.price),
    originalPrice: product.originalPrice
      ? Number(product.originalPrice)
      : undefined,
    description: product.description,
    longDescription: product.longDescription || "",
    fabricType: product.fabricType,
    color: product.color,
    colorHex: product.colorHex,
    images: parseProductImages(product.images),
    imageLabels: parseProductImages(product.imageLabels),
    videoUrl: product.videoUrl || undefined,
    tags: parseJsonArray(product.tags),
    badge: product.badge
      ? productBadgeMap[product.badge]
      : undefined,
    inStock: product.inStock,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
    sku: product.sku,
    metaTitle: product.metaTitle || undefined,
    metaDescription: product.metaDescription || undefined,
  };
}

/**
 * Load one catalog page using only additive assignments and existing Product
 * rows. This function never falls back to, calls, or mutates the legacy /shop
 * query path.
 */
export async function getCatalogPageData(
  canonicalPath: string,
  input: CatalogQueryInput = {}
): Promise<CatalogPageData | null> {
  const node = await resolveActiveCatalogNode(canonicalPath);
  if (!node) return null;

  const query = normalizeQuery(input);
  const productWhere = productWhereForCatalog(query);
  const assignmentWhere: Prisma.ProductCatalogAssignmentWhereInput = {
    catalogNodeId: node.id,
    product: productWhere,
  };

  const [assignments, total] = await Promise.all([
    prisma.productCatalogAssignment.findMany({
      where: assignmentWhere,
      include: { product: true },
      orderBy: assignmentOrderBy(query.sort),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.productCatalogAssignment.count({
      where: assignmentWhere,
    }),
  ]);

  const totalPages = Math.ceil(total / query.pageSize);

  return {
    node,
    products: assignments.map(transformCatalogProduct),
    query,
    total,
    totalPages,
    hasPreviousPage: query.page > 1,
    hasNextPage: query.page < totalPages,
  };
}
