import { prisma } from "@/lib/db";
import type { Product, Category } from "@/lib/data";
import { parseProductImages, parseJsonArray } from "@/lib/utils/parse-images";
import { unstable_cache } from "next/cache";

const badgeMap: Record<string, Product["badge"]> = {
  NEW: "New",
  TRENDING: "Trending",
  HOT: "Hot",
  LIMITED: "Limited",
  FEATURED: "Featured",
};

function transformProduct(p: any): Product {
  // Compute review stats if reviews relation was included
  let rating: number | undefined;
  let reviewCount: number = 0;
  if (p.reviews && Array.isArray(p.reviews)) {
    const visibleReviews = p.reviews.filter((r: any) => r.isVisible === true && !r.deletedAt);
    reviewCount = visibleReviews.length;
    if (reviewCount > 0) {
      const sum = visibleReviews.reduce((acc: number, r: any) => acc + r.rating, 0);
      rating = Number((sum / reviewCount).toFixed(1));
    }
  }

  return {
    id: p.id,
    name: p.name,
    slug: p.slug || undefined,
    price: Number(p.price),
    originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
    description: p.description,
    longDescription: p.longDescription || "",
    fabricType: p.fabricType || "Cotton",
    color: p.color,
    colorHex: p.colorHex,
    images: parseProductImages(p.images),
    imageLabels: parseProductImages(p.imageLabels),
    videoUrl: p.videoUrl || undefined,
    tags: parseJsonArray(p.tags),
    badge: p.badge ? badgeMap[p.badge] : undefined,
    inStock: p.inStock,
    stockQuantity: p.stockQuantity,
    lowStockThreshold: p.lowStockThreshold,
    sku: p.sku,
    metaTitle: p.metaTitle || undefined,
    metaDescription: p.metaDescription || undefined,
    rating,
    reviewCount,
  };
}

export interface ProductFilterInput {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "featured" | "newest" | "trending" | "price-asc" | "price-desc";
  search?: string;
  color?: string;
  season?: string;
  page?: number;
  limit?: number;
}

export type RecommendationStrategy = "category" | "cooccurrence" | "hybrid";

export interface RecommendationsInput {
  productId: string;
  limit?: number;
  strategy?: RecommendationStrategy;
}

export interface RecommendationResult {
  frequentlyBought: Product[];
  youMayAlsoLike: Product[];
}

async function _getAllProducts(limit?: number): Promise<Product[]> {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      reviews: {
        select: { rating: true, isVisible: true, deletedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
    ...(limit ? { take: limit } : {}),
  });
  return products.map(transformProduct);
}

// Cached: 2-min TTL, tag "products" for admin-triggered revalidation
export const getAllProducts = unstable_cache(
  _getAllProducts,
  ["all-products"],
  { revalidate: 120, tags: ["products"] }
);

async function _getProductById(id: string): Promise<Product | null> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      reviews: {
        select: { rating: true, isVisible: true, deletedAt: true },
      },
    },
  });
  return product ? transformProduct(product) : null;
}

// Cached: 5-min TTL, invalidated when admin updates/creates a product
export const getProductById = unstable_cache(
  _getProductById,
  ["product-by-id"],
  { revalidate: 300, tags: ["products"] }
);

async function _getProductBySlug(slug: string): Promise<Product | null> {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      reviews: {
        select: { rating: true, isVisible: true, deletedAt: true },
      },
    },
  });
  return product ? transformProduct(product) : null;
}

// Cached: 5-min TTL, same tag as getProductById
export const getProductBySlug = unstable_cache(
  _getProductBySlug,
  ["product-by-slug"],
  { revalidate: 300, tags: ["products"] }
);

export async function getProductVariations(name: string): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { name },
    include: {
      category: true,
      reviews: {
        select: { rating: true, isVisible: true, deletedAt: true },
      },
    },
  });
  return products.map(transformProduct);
}

async function _getFilteredProducts(filter: ProductFilterInput) {
  const where: any = {};
  if (filter.category) {
    const cats = filter.category.split(",");
    if (cats.length > 1) {
      where.fabricType = { in: cats, mode: "insensitive" };
    } else {
      where.fabricType = { equals: filter.category, mode: "insensitive" };
    }
  }
  if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
    where.price = {};
    if (filter.minPrice !== undefined) where.price.gte = filter.minPrice;
    if (filter.maxPrice !== undefined) where.price.lte = filter.maxPrice;
  }
  if (filter.search) {
    // ── Color synonym & spelling-variant map ─────────────────────────────
    // Keys are what a user might type; values are all DB variants to match.
    // Covers: British/American spelling, hyphenation, common shade aliases,
    // and conceptually related tones used in Pakistani menswear.
    const COLOR_SYNONYMS: Record<string, string[]> = {
      // gray / grey
      "gray":       ["gray", "grey"],
      "grey":       ["gray", "grey"],
      // white variants
      "white":      ["white", "off white", "off-white", "offwhite", "ivory", "cream", "pearl", "snow"],
      "off-white":  ["off white", "off-white", "offwhite", "ivory", "cream", "pearl"],
      "offwhite":   ["off white", "off-white", "offwhite", "ivory", "cream", "pearl"],
      "ivory":      ["ivory", "off white", "off-white", "cream", "pearl"],
      "cream":      ["cream", "ivory", "off white", "beige", "pearl"],
      "pearl":      ["pearl", "ivory", "cream", "off white"],
      // beige / tan family
      "beige":      ["beige", "tan", "sand", "camel", "champagne", "khaki", "nude"],
      "tan":        ["tan", "beige", "sand", "camel", "khaki"],
      "camel":      ["camel", "tan", "beige", "sand", "brown"],
      "champagne":  ["champagne", "beige", "cream", "ivory", "gold"],
      "khaki":      ["khaki", "tan", "beige", "olive"],
      "nude":       ["nude", "beige", "skin", "blush"],
      // blue family
      "blue":       ["blue", "navy", "cobalt", "royal", "denim", "sky", "teal", "turquoise", "aqua", "indigo"],
      "navy":       ["navy", "navy blue", "dark blue", "midnight blue"],
      "cobalt":     ["cobalt", "royal blue", "cobalt blue"],
      "sky":        ["sky", "sky blue", "baby blue", "light blue"],
      "indigo":     ["indigo", "denim", "navy"],
      "teal":       ["teal", "turquoise", "aqua", "cyan"],
      "turquoise":  ["turquoise", "teal", "aqua", "cyan"],
      // green family
      "green":      ["green", "olive", "emerald", "forest", "mint", "sage", "army", "military", "bottle"],
      "olive":      ["olive", "army green", "military", "khaki"],
      "emerald":    ["emerald", "emerald green", "bottle green", "forest green"],
      "mint":       ["mint", "mint green", "sage"],
      // red family
      "red":        ["red", "crimson", "scarlet", "maroon", "burgundy", "wine", "cherry", "rust"],
      "maroon":     ["maroon", "burgundy", "wine", "dark red", "crimson"],
      "burgundy":   ["burgundy", "maroon", "wine", "dark red"],
      "wine":       ["wine", "burgundy", "maroon", "dark red"],
      "crimson":    ["crimson", "scarlet", "red", "maroon"],
      "rust":       ["rust", "terracotta", "brick", "burnt orange"],
      "terracotta": ["terracotta", "rust", "brick", "clay"],
      // pink / purple family
      "pink":       ["pink", "rose", "blush", "fuchsia", "coral", "hot pink", "baby pink", "light pink"],
      "rose":       ["rose", "pink", "blush", "mauve"],
      "blush":      ["blush", "pink", "rose", "nude", "baby pink"],
      "purple":     ["purple", "violet", "lavender", "mauve", "plum", "lilac"],
      "violet":     ["violet", "purple", "lavender", "plum"],
      "lavender":   ["lavender", "purple", "lilac", "mauve"],
      "mauve":      ["mauve", "lavender", "rose", "purple"],
      "plum":       ["plum", "purple", "maroon", "dark purple"],
      // orange / yellow family
      "orange":     ["orange", "rust", "amber", "peach", "apricot", "terracotta"],
      "yellow":     ["yellow", "mustard", "golden", "gold", "lemon", "butter"],
      "mustard":    ["mustard", "golden", "gold", "yellow", "ochre"],
      "gold":       ["gold", "golden", "mustard", "champagne"],
      "peach":      ["peach", "apricot", "coral", "blush", "salmon"],
      "coral":      ["coral", "peach", "salmon", "orange"],
      // brown family
      "brown":      ["brown", "chocolate", "coffee", "caramel", "chestnut", "camel", "tan", "mocha"],
      "chocolate":  ["chocolate", "brown", "dark brown", "coffee"],
      "coffee":     ["coffee", "brown", "mocha", "chocolate"],
      "caramel":    ["caramel", "brown", "golden", "tan"],
      // black / dark family
      "black":      ["black", "charcoal", "dark", "jet", "onyx", "ebony"],
      "charcoal":   ["charcoal", "dark grey", "dark gray", "anthracite", "slate"],
      "slate":      ["slate", "charcoal", "dark grey", "dark gray", "grey", "gray"],
      // silver / light
      "silver":     ["silver", "silver mist", "grey", "gray", "light grey"],

      // ── Fabric / category synonyms ───────────────────────────────────
      // Cotton
      "cotton":     ["cotton", "cottons", "pure cotton"],
      // Wash & Wear — user may omit the & or use "and"
      "wash":       ["wash", "wash & wear", "wash and wear"],
      "wear":       ["wear", "wash & wear", "wash and wear"],
      "ww":         ["wash & wear", "wash and wear"],
      // Boski — silk-cotton blend
      "boski":      ["boski", "silk", "boski silk", "silk blend", "silk cotton"],
      "silk":       ["silk", "boski", "boski silk", "silk blend"],
      // Khaddar — handwoven traditional
      "khaddar":    ["khaddar", "khadar", "khaddr", "handwoven", "hand woven", "traditional"],
      "khadar":     ["khaddar", "khadar", "khaddr"],
      "handwoven":  ["handwoven", "hand woven", "khaddar"],
      "traditional":["traditional", "khaddar", "handwoven"],
      // Wool Blend — winter
      "wool":       ["wool", "wool blend", "woolen", "woollen", "winter"],
      "woolen":     ["woolen", "woollen", "wool", "wool blend"],
      "winter":     ["winter", "wool", "wool blend", "khaddar"],
      // Lawn / Linen / Chiffon (if added later)
      "lawn":       ["lawn"],
      "linen":      ["linen"],
      "chiffon":    ["chiffon"],
      // General fabric words
      "fabric":     ["fabric", "cloth", "material"],
      "suit":       ["suit", "fabric", "cloth"],
      "unstitched": ["unstitched", "fabric", "cloth"],
      // color/colour
      "color":      ["color", "colour"],
      "colour":     ["color", "colour"],
    };

    // Split user query into individual words, expand each with synonyms,
    // deduplicate, then build a flat OR clause: any variant in any field = match.
    const rawWords = filter.search.trim().split(/\s+/).filter(Boolean);
    const expandedSet = new Set<string>();
    for (const word of rawWords) {
      const lower = word.toLowerCase();
      const variants = COLOR_SYNONYMS[lower] ?? [word];
      for (const v of variants) expandedSet.add(v);
    }

    where.OR = Array.from(expandedSet).flatMap((word) => [
      { name:        { contains: word, mode: "insensitive" } },
      { color:       { contains: word, mode: "insensitive" } },
      { fabricType:  { contains: word, mode: "insensitive" } },
      { description: { contains: word, mode: "insensitive" } },
    ]);
  }
  if (filter.color) {
    where.color = { equals: filter.color, mode: "insensitive" };
  }
  if (filter.season) {
    where.tags = { contains: filter.season, mode: "insensitive" };
  }

  let orderBy: any = {};
  switch (filter.sort) {
    case "price-asc":
      orderBy = { price: "asc" };
      break;
    case "price-desc":
      orderBy = { price: "desc" };
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
    case "trending":
      orderBy = { badge: "desc" };
      break;
    default:
      orderBy = { createdAt: "desc" };
  }

  const page = filter.page ?? 1;
  const limit = filter.limit ?? 20;
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        category: true,
        reviews: {
          select: { rating: true, isVisible: true, deletedAt: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: products.map(transformProduct),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// Cached: 2-min TTL. Cache key includes serialised filter args so every
// unique filter combination gets its own cache entry. The "products" tag
// is still used for admin-triggered revalidation across all entries.
export const getFilteredProducts = (filter: ProductFilterInput) =>
  unstable_cache(
    () => _getFilteredProducts(filter),
    ["filtered-products", JSON.stringify(filter)],
    { revalidate: 120, tags: ["products"] }
  )();

async function _getDistinctColors(): Promise<string[]> {
  const products = await prisma.product.findMany({
    distinct: ["color"],
    select: { color: true },
  });
  return products.map((p) => p.color).sort();
}

// Cached: 10-min TTL. Colors change rarely and this query runs on every shop page load.
export const getDistinctColors = unstable_cache(
  _getDistinctColors,
  ["distinct-colors"],
  { revalidate: 600, tags: ["products"] }
);

export async function getFrequentlyBoughtTogether(
  productId: string,
  limit: number = 4
): Promise<Product[]> {
  const orderItems = await prisma.orderItem.findMany({
    where: { productId },
    select: { orderId: true },
  });

  const orderIds = orderItems.map((oi) => oi.orderId);
  if (orderIds.length === 0) {
    return getRelatedProducts(productId, limit);
  }

  const cooccurrences = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      orderId: { in: orderIds },
      productId: { not: productId },
    },
    _count: { productId: true },
    orderBy: { _count: { productId: "desc" } },
    take: limit,
  });

  if (cooccurrences.length === 0) {
    return getRelatedProducts(productId, limit);
  }

  const relatedIds = cooccurrences.map((c) => c.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: relatedIds } },
    include: {
      category: true,
      reviews: { select: { rating: true, isVisible: true, deletedAt: true } },
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  const orderedProducts = relatedIds
    .map((id) => productMap.get(id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  return orderedProducts.map(transformProduct);
}

export const getProductRecommendations = unstable_cache(
  async (
    productId: string,
    limit: number = 4
  ): Promise<RecommendationResult> => {
    const [frequentlyBought, youMayAlsoLike] = await Promise.all([
      getFrequentlyBoughtTogether(productId, limit),
      getRelatedProducts(productId, limit),
    ]);

    const frequentlyBoughtIds = new Set(frequentlyBought.map((p) => p.id));
    const dedupedYouMayAlsoLike = youMayAlsoLike.filter(
      (p) => !frequentlyBoughtIds.has(p.id)
    );

    return {
      frequentlyBought,
      youMayAlsoLike: dedupedYouMayAlsoLike,
    };
  },
  ["product-recommendations"],
  { revalidate: 3600, tags: ["recommendations"] }
);

export async function getRelatedProducts(
  productId: string,
  limit: number = 4
): Promise<Product[]> {
  const source = await prisma.product.findUnique({
    where: { id: productId },
  });
  if (!source) return [];

  const sourcePrice = Number(source.price);

  let related = await prisma.product.findMany({
    where: {
      id: { not: productId },
      categoryId: source.categoryId,
      price: {
        gte: sourcePrice * 0.7,
        lte: sourcePrice * 1.3,
      },
      inStock: true,
    },
    orderBy: [
      { orderItems: { _count: "desc" } },
    ],
    take: limit,
    include: {
      category: true,
      reviews: { select: { rating: true, isVisible: true, deletedAt: true } },
    },
  });

  if (related.length < limit) {
    const existingIds = new Set(related.map((p) => p.id));
    existingIds.add(productId);

    const backfill = await prisma.product.findMany({
      where: {
        id: { notIn: Array.from(existingIds) },
        fabricType: source.fabricType,
        inStock: true,
      },
      orderBy: [
        { orderItems: { _count: "desc" } },
      ],
      take: limit - related.length,
      include: {
        category: true,
        reviews: { select: { rating: true, isVisible: true, deletedAt: true } },
      },
    });

    related = [...related, ...backfill];
  }

  return related.map(transformProduct);
}

async function _getAllCategories(): Promise<Category[]> {
  // Fetch ALL categories from the Category table so every category always
  // appears in the sidebar -- even those with 0 products currently.
  const allCategories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  // Get real product counts grouped by fabricType (case-sensitive as stored).
  const fabricGroups = await prisma.product.groupBy({
    by: ["fabricType"],
    _count: { fabricType: true },
  });

  // Build a lowercase lookup map: fabricType -> count
  const countMap = new Map<string, number>();
  for (const g of fabricGroups) {
    if (!g.fabricType) continue;
    const key = g.fabricType.toLowerCase();
    const currentCount = countMap.get(key) || 0;
    countMap.set(key, currentCount + g._count.fabricType);
  }

  // Fallback images keyed by lowercase category name.
  // Used when the Category record has no image set in the database.
  const fallbackImages: Record<string, string> = {
    "cotton":     "/images/fabrics/cat_cotton_1776582727723.png",
    "wash & wear":"/images/fabrics/hero_wash_1776582631696.png",
    "boski":      "/images/fabrics/hero_boski_1776582616605.png",
    "wool blend": "/images/fabrics/cat_wool_1776583171222.png",
    "khaddar":    "/images/fabrics/promo_1776582682565.png",
  };

  // Return all categories. The `id` is the category name so it matches the
  // fabricType field used in getFilteredProducts -- keeping filtering correct.
  return allCategories.map((c) => ({
    id: c.name,                                    // matches fabricType for filtering
    name: c.name,
    description: c.description || "",
    // Use the DB image if present, otherwise fall back to the known local asset.
    image: c.image || fallbackImages[c.name.toLowerCase()] || "/placeholder.jpg",
    productCount: countMap.get(c.name.toLowerCase()) ?? 0,
  }));
}

// Cached: 10-min TTL. Categories change rarely and this query runs on every shop page load.
export const getAllCategories = unstable_cache(
  _getAllCategories,
  ["all-categories"],
  { revalidate: 600, tags: ["categories"] }
);

async function _getFeaturedCategories(): Promise<Category[]> {
  // Call the raw function directly (not the cached wrapper) to avoid double-caching
  const allCategories = await _getAllCategories();

  // Normalize: strip all non-alphanumeric chars and lowercase.
  // e.g. "Wash And Wear " -> "washandwear", "Wash & Wear" -> "washandwear"
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  try {
    const row = await prisma.storeConfig.findUnique({
      where: { key: "featured_categories" }
    });

    if (row) {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((fc: any) => {
          // Match by exact id first, then by normalized name so "Wash And Wear"
          // correctly resolves to the "Wash & Wear" category from allCategories.
          const dbMatch = allCategories.find(c =>
            (fc.id && c.id.toLowerCase() === fc.id.toLowerCase()) ||
            normalize(c.name) === normalize(fc.name)
          );
          return {
            // Use the real category id (= fabricType name) from DB so filtering works.
            id: dbMatch?.id ?? fc.name ?? fc.id,
            name: fc.name,
            description: fc.description || "",
            image: fc.image || dbMatch?.image || "/placeholder.jpg",
            productCount: dbMatch?.productCount ?? fc.productCount ?? 0,
          };
        });
      }
    }
  } catch (error) {
    console.error("Error fetching featured categories from StoreConfig:", error);
  }

  // Fallback to the regular categories if no StoreConfig is set
  return allCategories;
}

// Cached: 10-min TTL. Featured categories are admin-configured and rarely change.
export const getFeaturedCategories = unstable_cache(
  _getFeaturedCategories,
  ["featured-categories"],
  { revalidate: 600, tags: ["categories"] }
);

// ── Admin helpers ────────────────────────────────────────────────

export async function getAdminProducts(
  page?: number,
  limit?: number,
  search?: string,
  category?: string,
  stock?: string
) {
  const currentPage = page ?? 1;
  const pageSize = limit ?? 50;
  const skip = (currentPage - 1) * pageSize;

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category && category !== "all") {
    where.fabricType = { equals: category, mode: "insensitive" };
  }

  if (stock && stock !== "all") {
    if (stock === "in-stock") {
      where.stockQuantity = { gt: 10 }; // Assuming threshold is 10 for global filter if not dynamic
    } else if (stock === "low-stock") {
      where.stockQuantity = { lte: 10, gt: 0 };
    } else if (stock === "out-of-stock") {
      where.stockQuantity = 0;
    }
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        originalPrice: true,
        fabricType: true,
        color: true,
        colorHex: true,
        images: true,
        videoUrl: true,
        badge: true,
        inStock: true,
        stockQuantity: true,
        lowStockThreshold: true,
        description: true,
        categoryId: true,
        category: true,
        slug: true,
        tags: true,
        metaTitle: true,
        metaDescription: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: Number(p.price),
      originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
      fabricType: p.fabricType || "Cotton",
      color: p.color,
      colorHex: p.colorHex,
      images: parseProductImages(p.images),
      videoUrl: p.videoUrl || undefined,
      badge: p.badge ? badgeMap[p.badge] : undefined,
      inStock: p.inStock,
      stockQuantity: p.stockQuantity,
      lowStockThreshold: p.lowStockThreshold,
      description: p.description,
      categoryId: p.categoryId,
      slug: p.slug || p.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      tags: parseJsonArray(p.tags),
      metaTitle: p.metaTitle || undefined,
      metaDescription: p.metaDescription || undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    total,
    page: currentPage,
    limit: pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function createAdminProduct(data: any) {
  const product = await prisma.product.create({
    data: {
      sku: data.sku,
      slug: data.slug || data.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: data.name,
      description: data.description,
      longDescription: data.longDescription,
      price: data.price,
      originalPrice: data.originalPrice,
      fabricType: data.fabricType,
      color: data.color,
      colorHex: data.colorHex,
      images: JSON.stringify(data.images),
      videoUrl: data.videoUrl || null,
      tags: JSON.stringify(data.tags || []),
      badge: data.badge,
      inStock: data.inStock ?? true,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      categoryId: data.categoryId,
    },
    include: { category: true },
  });

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    price: Number(product.price),
    originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
    fabricType: product.fabricType || "Cotton",
    color: product.color,
    colorHex: product.colorHex,
    images: parseProductImages(product.images),
    videoUrl: product.videoUrl || undefined,
    badge: product.badge ? badgeMap[product.badge] : undefined,
    inStock: product.inStock,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
    description: product.description,
    longDescription: product.longDescription || "",
    slug: product.slug || product.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    tags: parseJsonArray(product.tags),
    metaTitle: product.metaTitle || undefined,
    metaDescription: product.metaDescription || undefined,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export async function updateAdminProduct(id: string, data: any) {
  const updateData: any = {};
  if (data.sku !== undefined) updateData.sku = data.sku;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.longDescription !== undefined) updateData.longDescription = data.longDescription;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.originalPrice !== undefined) updateData.originalPrice = data.originalPrice;
  if (data.fabricType !== undefined) updateData.fabricType = data.fabricType;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.colorHex !== undefined) updateData.colorHex = data.colorHex;
  if (data.images !== undefined) updateData.images = JSON.stringify(data.images);
  if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl || null;
  if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
  if (data.badge !== undefined) updateData.badge = data.badge;
  if (data.inStock !== undefined) updateData.inStock = data.inStock;
  if (data.stockQuantity !== undefined) updateData.stockQuantity = data.stockQuantity;
  if (data.lowStockThreshold !== undefined) updateData.lowStockThreshold = data.lowStockThreshold;
  if (data.metaTitle !== undefined) updateData.metaTitle = data.metaTitle;
  if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;

  const product = await prisma.product.update({
    where: { id },
    data: updateData,
    include: { category: true },
  });

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    price: Number(product.price),
    originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
    fabricType: product.fabricType || "Cotton",
    color: product.color,
    colorHex: product.colorHex,
    images: parseProductImages(product.images),
    videoUrl: product.videoUrl || undefined,
    badge: product.badge ? badgeMap[product.badge] : undefined,
    inStock: product.inStock,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
    description: product.description,
    longDescription: product.longDescription || "",
    slug: product.slug || product.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    tags: parseJsonArray(product.tags),
    metaTitle: product.metaTitle || undefined,
    metaDescription: product.metaDescription || undefined,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export async function getLowStockProducts(threshold?: number) {
  const products = await prisma.product.findMany({
    where: {
      AND: [
        { stockQuantity: { lte: threshold ?? 5 } },
        { stockQuantity: { gt: 0 } },
      ],
    },
    include: { category: true },
    orderBy: { stockQuantity: "asc" },
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: Number(p.price),
    originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
    fabricType: p.fabricType || "Cotton",
    color: p.color,
    colorHex: p.colorHex,
    images: parseProductImages(p.images),
    videoUrl: p.videoUrl || undefined,
    badge: p.badge ? badgeMap[p.badge] : undefined,
    inStock: p.inStock,
    stockQuantity: p.stockQuantity,
    lowStockThreshold: p.lowStockThreshold,
    description: p.description,
    longDescription: p.longDescription || "",
    slug: p.slug || p.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    tags: parseJsonArray(p.tags),
    metaTitle: p.metaTitle || undefined,
    metaDescription: p.metaDescription || undefined,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export async function getAdminProductsWithStock(
  { page = 1, limit = 50 }: { page?: number; limit?: number } = {}
) {
  const skip = (page - 1) * limit;

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      // Strict select — category is not used in the return shape; removed the join
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        originalPrice: true,
        fabricType: true,
        color: true,
        colorHex: true,
        images: true,
        videoUrl: true,
        badge: true,
        inStock: true,
        stockQuantity: true,
        lowStockThreshold: true,
        description: true,
        longDescription: true,
        slug: true,
        tags: true,
        metaTitle: true,
        metaDescription: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { stockQuantity: "asc" },
      skip,
      take: limit,
    }),
    prisma.product.count(),
  ]);

  return {
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: Number(p.price),
      originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
      fabricType: p.fabricType || "Cotton",
      color: p.color,
      colorHex: p.colorHex,
      images: parseProductImages(p.images),
      videoUrl: p.videoUrl || undefined,
      badge: p.badge ? badgeMap[p.badge] : undefined,
      inStock: p.inStock,
      stockQuantity: p.stockQuantity,
      lowStockThreshold: p.lowStockThreshold,
      description: p.description,
      longDescription: p.longDescription || "",
      slug: p.slug || p.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      tags: parseJsonArray(p.tags),
      metaTitle: p.metaTitle || undefined,
      metaDescription: p.metaDescription || undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
