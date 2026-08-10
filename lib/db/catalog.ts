import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ARCHIVED_PRODUCT_TAG, visibleProductTags } from "@/lib/product-archive";
import type { Product, ProductKind } from "@/lib/data";
import { PRODUCT_KIND_VALUES } from "@/lib/commerce";
import { parseProductImages } from "@/lib/utils/parse-images";
import {
  getCommerceProfilesByProductId,
  resolveCategoryFabricTypes,
} from "@/lib/db/products";

export const CATALOG_PAGE_SIZE = 24;
export const CATALOG_MAX_PAGE_SIZE = 48;
export const CATALOG_MAX_PAGE = 1_000;

export const CATALOG_SORT_OPTIONS = [
  "featured",
  "newest",
  "trending",
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
  // Raw /shop category values. They are resolved through the established
  // legacy alias/fabricType helper before filtering catalog assignments.
  categoryIds?: string[];
  color?: string;
  season?: string;
  productKind?: ProductKind;
  option?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export interface CatalogFilterOptionGroup {
  label: string;
  values: string[];
}

/**
 * Facets are calculated only from products assigned to the current catalog
 * node. This keeps a perfume or gift page from exposing irrelevant fabric or
 * apparel values, without changing the legacy /shop query contract.
 */
export interface CatalogFilterFacets {
  fabrics: string[];
  colors: string[];
  productKinds: ProductKind[];
  optionGroups: CatalogFilterOptionGroup[];
}

export interface CatalogBreadcrumb {
  id: string;
  label: string;
  path: string;
}

/**
 * Read-only, published navigation used by category-page sidebars. The label
 * includes its parent labels so the same compact selector used by /shop can
 * represent both departments and deeply nested subcategories.
 */
export interface CatalogSidebarNavigationOption {
  path: string;
  label: string;
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
  productKind: ProductKind | null;
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
  facets: CatalogFilterFacets;
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
  productKind: true,
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

type PublishedCatalogNavigationNode = {
  id: string;
  parentId: string | null;
  label: string;
  path: string;
  displayOrder: number;
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

function productKindParam(
  value: string | string[] | undefined
): ProductKind | undefined {
  const candidate = boundedText(value, 40) as ProductKind | undefined;
  return candidate && PRODUCT_KIND_VALUES.includes(candidate)
    ? candidate
    : undefined;
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
  const categoryIds = Array.isArray(input.categoryIds)
    ? Array.from(
        new Set(
          input.categoryIds
            .map((categoryId) => categoryId.trim())
            .filter(Boolean)
            .slice(0, 25)
        )
      )
    : undefined;

  return {
    page,
    pageSize,
    sort,
    search: input.search?.trim().slice(0, 100) || undefined,
    fabricType: input.fabricType?.trim().slice(0, 80) || undefined,
    categoryIds: categoryIds?.length ? categoryIds : undefined,
    color: input.color?.trim().slice(0, 80) || undefined,
    season: input.season?.trim().slice(0, 80) || undefined,
    productKind:
      input.productKind && PRODUCT_KIND_VALUES.includes(input.productKind)
        ? input.productKind
        : undefined,
    option: input.option?.trim().slice(0, 80) || undefined,
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
    categoryIds: firstParam(params.category)
      ?.split(",")
      .map((categoryId) => categoryId.trim())
      .filter(Boolean),
    color: boundedText(params.color, 80),
    season: boundedText(params.season, 80),
    productKind: productKindParam(params.kind),
    option: boundedText(params.option, 80),
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

/**
 * Load only published catalog paths and omit children whose ancestor chain is
 * incomplete. This reflects Admin publication changes immediately while never
 * exposing a hidden or staged path in the customer sidebar.
 */
export const getPublishedCatalogSidebarNavigation = cache(
  async (): Promise<CatalogSidebarNavigationOption[]> => {
    const nodes = await prisma.catalogNode.findMany({
      where: { isActive: true, isVisible: true },
      select: {
        id: true,
        parentId: true,
        label: true,
        path: true,
        displayOrder: true,
      },
      orderBy: [{ displayOrder: "asc" }, { label: "asc" }],
    });

    const nodesById = new Map<string, PublishedCatalogNavigationNode>(
      nodes.map((node) => [node.id, node])
    );

    const hierarchyFor = (node: PublishedCatalogNavigationNode): string[] | null => {
      const labels: string[] = [];
      const visited = new Set<string>();
      let current: PublishedCatalogNavigationNode | undefined = node;

      while (current) {
        if (visited.has(current.id)) return null;
        visited.add(current.id);
        labels.unshift(current.label);

        if (!current.parentId) return labels;
        current = nodesById.get(current.parentId);
      }

      return null;
    };

    return nodes
      .filter((node) =>
        /^\/(?:women|men|fragrance-beauty|teens)(?:\/|$)/.test(node.path)
      )
      .map((node) => {
        const hierarchy = hierarchyFor(node);
        return hierarchy ? { path: node.path, label: hierarchy.join(" · ") } : null;
      })
      .filter((option): option is CatalogSidebarNavigationOption => option !== null)
      .sort((left, right) => left.label.localeCompare(right.label, "en"));
  }
);

function productWhereForCatalog(
  query: CatalogPageData["query"],
  categoryFabricTypes: string[]
): Prisma.ProductWhereInput {
  const price: Prisma.DecimalFilter | undefined =
    query.minPrice !== undefined || query.maxPrice !== undefined
      ? {
          ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
          ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
        }
      : undefined;

  const fabricTypeFilters: Prisma.ProductWhereInput[] = [];
  if (query.fabricType) {
    fabricTypeFilters.push({
      fabricType: {
        equals: query.fabricType,
        mode: "insensitive" as const,
      },
    });
  }
  if (categoryFabricTypes.length) {
    fabricTypeFilters.push({
      fabricType: {
        in: categoryFabricTypes,
        mode: "insensitive" as const,
      },
    });
  }

  const conditions: Prisma.ProductWhereInput[] = [
    { NOT: { tags: { contains: ARCHIVED_PRODUCT_TAG } } },
  ];

  if (query.search) {
    conditions.push({
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
        {
          commerceProfile: {
            is: {
              options: {
                some: { values: { some: { label: { contains: query.search, mode: "insensitive" as const } } } },
              },
            },
          },
        },
      ],
    });
  }

  if (fabricTypeFilters.length) conditions.push(...fabricTypeFilters);

  if (query.color) {
    conditions.push({
      OR: [
        { color: { equals: query.color, mode: "insensitive" as const } },
        {
          commerceProfile: {
            is: {
              options: {
                some: {
                  type: { in: ["COLOR", "SHADE"] },
                  values: {
                    some: {
                      isActive: true,
                      label: { equals: query.color, mode: "insensitive" as const },
                      selections: { some: { variant: { isActive: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      ],
    });
  }

  if (query.season) {
    // Product tags are the legacy season source. This is only applied to an
    // additive catalog path and does not alter /shop queries.
    conditions.push({ tags: { contains: query.season } });
  }

  if (query.productKind) {
    conditions.push(
      query.productKind === "UNSTITCHED_FABRIC"
        ? {
            // Products without a profile retain the live, legacy unstitched
            // behaviour, so the new facet must include them rather than
            // hiding the existing catalog.
            OR: [
              { commerceProfile: { is: null } },
              {
                commerceProfile: {
                  is: { productKind: "UNSTITCHED_FABRIC" },
                },
              },
            ],
          }
        : {
            commerceProfile: {
              is: { productKind: query.productKind },
            },
          }
    );
  }

  if (query.option) {
    conditions.push({
      commerceProfile: {
        is: {
          OR: [
            { variants: { some: { isActive: true, label: { equals: query.option, mode: "insensitive" as const } } } },
            { options: { some: { values: { some: { isActive: true, label: { equals: query.option, mode: "insensitive" as const }, selections: { some: { variant: { isActive: true } } } } } } } },
          ],
        },
      },
    });
  }

  if (price) {
    const variantRange: Prisma.ProductCommerceProfileWhereInput = {
      requiresSelection: true,
      ...(query.maxPrice !== undefined ? { minPrice: { lte: query.maxPrice } } : {}),
      ...(query.minPrice !== undefined ? { maxPrice: { gte: query.minPrice } } : {}),
    };
    conditions.push({
      OR: [
        { commerceProfile: { is: null }, price },
        { commerceProfile: { is: { requiresSelection: false } }, price },
        { commerceProfile: { is: variantRange } },
      ],
    });
  }
  if (query.inStock === true) conditions.push({ inStock: true });

  return { AND: conditions };
}

function normalizedFacetValues(values: Iterable<string | null | undefined>) {
  const unique = new Map<string, string>();

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLocaleLowerCase("en-US");
    if (!unique.has(key)) unique.set(key, trimmed);
  }

  return [...unique.values()].sort((left, right) =>
    left.localeCompare(right, "en", { sensitivity: "base" })
  );
}

function fallbackOptionLabel(productKind: ProductKind): string {
  switch (productKind) {
    case "READY_TO_WEAR":
    case "TEENS":
      return "Size";
    case "FRAGRANCE":
      return "Volume";
    case "BEAUTY":
      return "Shade / option";
    case "GIFT":
    case "GIFT_BOX":
      return "Gift option";
    default:
      return "Option";
  }
}

async function getCatalogFilterFacets(
  catalogNodeIds: string[]
): Promise<CatalogFilterFacets> {
  const assignedProductWhere: Prisma.ProductWhereInput = {
    NOT: { tags: { contains: ARCHIVED_PRODUCT_TAG } },
    catalogAssignments: { some: { catalogNodeId: { in: catalogNodeIds } } },
  };
  const products = await prisma.product.findMany({
    where: assignedProductWhere,
    select: {
      fabricType: true,
      color: true,
      commerceProfile: {
        select: {
          productKind: true,
          optionLabel: true,
          variants: {
            where: { isActive: true },
            select: { label: true },
          },
          options: {
            orderBy: { displayOrder: "asc" },
            select: {
              label: true,
              type: true,
              values: {
                where: { isActive: true, selections: { some: { variant: { isActive: true } } } },
                select: { label: true },
              },
            },
          },
        },
      },
    },
  });

  const productKinds = new Set<ProductKind>();
  const optionGroups = new Map<string, string[]>();
  let hasLegacyUnstitchedProduct = false;

  for (const product of products) {
    if (!product.commerceProfile) {
      hasLegacyUnstitchedProduct = true;
      continue;
    }

    const profile = product.commerceProfile;
    productKinds.add(profile.productKind as ProductKind);
    for (const option of profile.options) {
      const values = optionGroups.get(option.label) || [];
      values.push(...option.values.map((value) => value.label));
      optionGroups.set(option.label, values);
    }
    if (!profile.variants.length) continue;

    if (profile.options.length) continue;

    const label = profile.optionLabel?.trim() || fallbackOptionLabel(
      profile.productKind as ProductKind
    );
    const values = optionGroups.get(label) || [];
    values.push(...profile.variants.map((variant) => variant.label));
    optionGroups.set(label, values);
  }

  if (hasLegacyUnstitchedProduct) productKinds.add("UNSTITCHED_FABRIC");

  return {
    fabrics: normalizedFacetValues(products.map((product) => product.fabricType)),
    colors: normalizedFacetValues([
      ...products.map((product) => product.color),
      ...products.flatMap((product) => product.commerceProfile?.options
        .filter((option) => option.type === "COLOR" || option.type === "SHADE")
        .flatMap((option) => option.values.map((value) => value.label)) || []),
    ]),
    productKinds: PRODUCT_KIND_VALUES.filter((kind) => productKinds.has(kind)),
    optionGroups: [...optionGroups.entries()]
      .map(([label, values]) => ({
        label,
        values: normalizedFacetValues(values).slice(0, 60),
      }))
      .filter((group) => group.values.length > 0)
      .sort((left, right) => left.label.localeCompare(right.label, "en")),
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
    case "trending":
      // Match the existing /shop behaviour for its Trending control while
      // keeping the sort scoped to the chosen additive catalog assignment.
      return [{ product: { badge: "desc" } }, stableIdOrder];
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

function productOrderBy(
  sort: CatalogSort
): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ createdAt: "desc" }, { id: "asc" }];
    case "trending":
      return [{ badge: "desc" }, { createdAt: "desc" }, { id: "asc" }];
    case "price-asc":
      return [{ price: "asc" }, { createdAt: "desc" }, { id: "asc" }];
    case "price-desc":
      return [{ price: "desc" }, { createdAt: "desc" }, { id: "asc" }];
    case "name-asc":
      return [{ name: "asc" }, { id: "asc" }];
    case "featured":
    default:
      // Parent collection pages aggregate their descendants. A Product-level
      // order is intentional here: it removes duplicate cards where a product
      // is assigned both to a parent and a child node. Direct-node pages retain
      // their existing assignment-level featured/display-order behaviour.
      return [{ createdAt: "desc" }, { id: "asc" }];
  }
}

function transformCatalogProduct(
  product: CatalogAssignmentWithProduct["product"],
  commerce?: Product["commerce"],
  catalogPath?: string,
): Product {
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
    tags: visibleProductTags(product.tags),
    badge: product.badge
      ? productBadgeMap[product.badge]
      : undefined,
    inStock: product.inStock,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
    sku: product.sku,
    metaTitle: product.metaTitle || undefined,
    metaDescription: product.metaDescription || undefined,
    ...(catalogPath ? { catalogPaths: [catalogPath] } : {}),
    commerce,
  };
}

async function getCatalogNodeScopeIds(node: ResolvedCatalogNode): Promise<string[]> {
  const nodes = await prisma.catalogNode.findMany({
    where: {
      isActive: true,
      isVisible: true,
      OR: [
        { id: node.id },
        { path: { startsWith: `${node.path}/` } },
      ],
    },
    select: { id: true },
  });

  // The resolved node is active and visible, but keep the exact node as a
  // defensive fallback if a future database implementation changes startsWith
  // semantics or a stale read omits it.
  return Array.from(new Set([node.id, ...nodes.map((item) => item.id)]));
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

  const normalizedQuery = normalizeQuery(input);
  // Size/product-kind facets are not meaningful inside an explicitly
  // unstitched node. Ignore stale bookmarked filters as well as hiding them.
  const query = node.productKind === "UNSTITCHED_FABRIC"
    ? { ...normalizedQuery, option: undefined, productKind: undefined }
    : normalizedQuery;
  // Keep catalog-path filtering identical to the longstanding /shop category
  // behavior, including aliases such as "wash-wear" and "Wash And Wear".
  const categoryFabricTypes = query.categoryIds?.length
    ? await resolveCategoryFabricTypes(query.categoryIds.join(","))
    : [];
  const productWhere = productWhereForCatalog(query, categoryFabricTypes);
  const scopeIds = await getCatalogNodeScopeIds(node);

  // A leaf node keeps the existing assignment-level merchandising order.
  // A parent node additionally includes every visible descendant so selecting
  // one precise admin subcategory makes the product discoverable at each
  // meaningful department/collection level without duplicating its card.
  if (scopeIds.length > 1) {
    const scopedProductWhere: Prisma.ProductWhereInput = {
      AND: [
        productWhere,
        {
          catalogAssignments: {
            some: { catalogNodeId: { in: scopeIds } },
          },
        },
      ],
    };
    const [products, total, facets] = await Promise.all([
      prisma.product.findMany({
        where: scopedProductWhere,
        orderBy: productOrderBy(query.sort),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.product.count({ where: scopedProductWhere }),
      getCatalogFilterFacets(scopeIds),
    ]);
    const commerceByProductId = await getCommerceProfilesByProductId(
      products.map((product) => product.id)
    );
    const totalPages = Math.ceil(total / query.pageSize);

    return {
      node,
      facets: node.productKind === "UNSTITCHED_FABRIC"
        ? { ...facets, productKinds: ["UNSTITCHED_FABRIC"], optionGroups: [] }
        : facets,
      products: products.map((product) =>
        transformCatalogProduct(
          product,
          commerceByProductId.get(product.id),
          node.path,
        )
      ),
      query,
      total,
      totalPages,
      hasPreviousPage: query.page > 1,
      hasNextPage: query.page < totalPages,
    };
  }

  const assignmentWhere: Prisma.ProductCatalogAssignmentWhereInput = {
    catalogNodeId: node.id,
    product: productWhere,
  };

  const [assignments, total, facets] = await Promise.all([
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
    getCatalogFilterFacets(scopeIds),
  ]);

  const totalPages = Math.ceil(total / query.pageSize);

  const commerceByProductId = await getCommerceProfilesByProductId(
    assignments.map((assignment) => assignment.productId)
  );

  return {
    node,
    facets: node.productKind === "UNSTITCHED_FABRIC"
      ? { ...facets, productKinds: ["UNSTITCHED_FABRIC"], optionGroups: [] }
      : facets,
    products: assignments.map((assignment) =>
      transformCatalogProduct(
        assignment.product,
        commerceByProductId.get(assignment.productId),
        node.path,
      )
    ),
    query,
    total,
    totalPages,
    hasPreviousPage: query.page > 1,
    hasNextPage: query.page < totalPages,
  };
}
