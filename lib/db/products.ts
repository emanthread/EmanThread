import { prisma } from "@/lib/db";
import type { Product, Category } from "@/lib/data";
import { parseProductImages, parseJsonArray } from "@/lib/utils/parse-images";

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

export async function getAllProducts(): Promise<Product[]> {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      reviews: {
        select: { rating: true, isVisible: true, deletedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return products.map(transformProduct);
}

export async function getProductById(id: string): Promise<Product | null> {
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

export async function getProductBySlug(slug: string): Promise<Product | null> {
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

export async function getFilteredProducts(
  filter: ProductFilterInput
): Promise<Product[]> {
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
    where.name = { contains: filter.search, mode: "insensitive" };
  }
  if (filter.color) {
    where.color = filter.color;
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

  const products = await prisma.product.findMany({
    where,
    orderBy,
    include: {
      category: true,
      reviews: {
        select: { rating: true, isVisible: true, deletedAt: true },
      },
    },
  });
  return products.map(transformProduct);
}

export async function getDistinctColors(): Promise<string[]> {
  const products = await prisma.product.findMany({
    distinct: ["color"],
    select: { color: true },
  });
  return products.map((p) => p.color).sort();
}

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

export async function getProductRecommendations(
  productId: string,
  limit: number = 4
): Promise<RecommendationResult> {
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
}

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

export async function getAllCategories(): Promise<Category[]> {
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
    countMap.set(g.fabricType.toLowerCase(), g._count.fabricType);
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

export async function getFeaturedCategories(): Promise<Category[]> {
  const allCategories = await getAllCategories();

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

// ── Admin helpers ────────────────────────────────────────────────

export async function getAdminProducts(page?: number, limit?: number, search?: string) {
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
        longDescription: true,
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
      longDescription: p.longDescription || "",
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
      include: { category: true },
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
