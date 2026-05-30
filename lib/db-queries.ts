import { prisma } from "./db";
import type { Product, Category } from "./data";
import { unstable_cache, revalidateTag } from "next/cache"; // M4
import { after } from "next/server";

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
    images: p.images ? JSON.parse(p.images) : [],
    imageLabels: p.imageLabels ? JSON.parse(p.imageLabels) : [],
    videoUrl: p.videoUrl || undefined,
    tags: p.tags ? JSON.parse(p.tags) : [],
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
  // appears in the sidebar — even those with 0 products currently.
  const allCategories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  // Get real product counts grouped by fabricType (case-sensitive as stored).
  const fabricGroups = await prisma.product.groupBy({
    by: ["fabricType"],
    _count: { fabricType: true },
  });

  // Build a lowercase lookup map: fabricType → count
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
  // fabricType field used in getFilteredProducts — keeping filtering correct.
  return allCategories.map((c) => ({
    id: c.name,                                    // matches fabricType for filtering
    name: c.name,
    description: c.description || "",
    // Use the DB image if present, otherwise fall back to the known local asset.
    image: c.image || fallbackImages[c.name.toLowerCase()] || "/placeholder.jpg",
    productCount: countMap.get(c.name.toLowerCase()) ?? 0,
  }));
}

// ── Order helpers ────────────────────────────────────────────────

export interface OrderItemInput {
  productId: string;
  quantity: number;
  price: number;
}

export interface ShippingAddressInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode?: string;
}

export interface CreateOrderInput {
  items: OrderItemInput[];
  shippingAddress: ShippingAddressInput;
  paymentMethod: string;
  notes?: string;
  userId?: string;
  subtotal: number;
  shippingCost: number;
  discountAmount?: number;
  couponCode?: string;
  grandTotal: number;
  stitchingFee?: number;
  stitchingItems?: Array<{ productId: string; fabricType: string; stitchingPrice: number }>;
}

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `ET-${year}-${random}`;
}

export async function createOrder(data: CreateOrderInput, skipStockDeduction = false) {
  const orderNumber = generateOrderNumber();

  const order = await prisma.$transaction(async (tx) => {
    // Verify order number is unique
    const existing = await tx.order.findUnique({
      where: { orderNumber },
    });
    if (existing) {
      throw new Error("Order number collision, please retry");
    }

    // Validate and atomically increment discount usage (C8)
    let appliedCouponCode: string | null = data.couponCode || null;
    if (data.couponCode) {
      const discount = await tx.discount.findUnique({
        where: { code: data.couponCode.toUpperCase() },
      });
      if (!discount) {
        appliedCouponCode = null;
      } else if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) {
        throw new Error("Discount usage limit reached");
      } else {
        await tx.discount.update({
          where: { id: discount.id },
          data: { usageCount: { increment: 1 } },
        });
      }
    }

    // Verify stock availability for each item
    for (const item of data.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stockQuantity: true, name: true },
      });
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      if (product.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stockQuantity}`);
      }
    }

    const created = await tx.order.create({
      data: {
        orderNumber,
        userId: data.userId || null,
        status: "PENDING",
        paymentMethod: data.paymentMethod as any,
        paymentStatus: skipStockDeduction ? "PENDING_VERIFICATION" : "PENDING",
        subtotal: data.subtotal,
        shippingCost: data.shippingCost,
        discountAmount: data.discountAmount ?? null,
        couponCode: appliedCouponCode, // C8: atomic discount validation
        grandTotal: data.grandTotal,
        notes: data.notes || null,
        shippingAddress: data.shippingAddress as any,
        stitchingFee: data.stitchingFee ?? 0,
        stitchingSnapshots: data.stitchingItems ? JSON.parse(JSON.stringify(data.stitchingItems)) : null,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            priceAtTimeOfPurchase: item.price,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    // Deduct stock for each product (skip when awaiting manual payment verification)
    // Also marks product as out of stock if stock reaches 0
    if (!skipStockDeduction) {
      for (const item of data.items) {
        const deducted = await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
          select: { stockQuantity: true },
        });
        // If stock reached 0 or below, mark as out of stock
        if (deducted.stockQuantity <= 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: { inStock: false },
          });
        }
      }
    }

    return created;
  });

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    grandTotal: Number(order.grandTotal),
    createdAt: order.createdAt.toISOString(),
  };
}

export async function getOrdersByUser(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    date: order.createdAt.toISOString().split("T")[0],
    status: order.status.toLowerCase() as
      | "pending"
      | "processing"
      | "shipped"
      | "delivered"
      | "cancelled",
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shippingCost),
    stitchingFee: Number(order.stitchingFee),
    discountAmount: Number(order.discountAmount || 0),
    total: Number(order.grandTotal),
    paymentMethod: order.paymentMethod,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.product.name,
      image: item.product.images
        ? JSON.parse(item.product.images)[0]
        : "/placeholder.jpg",
      quantity: item.quantity,
      price: Number(item.priceAtTimeOfPurchase),
    })),
  }));
}

export async function getOrderById(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) return null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    date: order.createdAt.toISOString().split("T")[0],
    status: order.status.toLowerCase() as
      | "pending"
      | "processing"
      | "shipped"
      | "delivered"
      | "cancelled",
    total: Number(order.grandTotal),
    paymentMethod: order.paymentMethod,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.product.name,
      image: item.product.images
        ? JSON.parse(item.product.images)[0]
        : "/placeholder.jpg",
      quantity: item.quantity,
      price: Number(item.priceAtTimeOfPurchase),
    })),
  };
}

// ── Admin helpers ────────────────────────────────────────────────

export async function getAdminOrders(options: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { status, search, page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status && status !== "all") {
    where.status = status.toUpperCase();
  }
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: { include: { product: true } },
        user: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.user?.id || "guest",
      customerName: order.user?.name || "Guest",
      customerEmail: order.user?.email || order.shippingAddress
        ? (order.shippingAddress as any).email
        : "",
      customerPhone: order.user?.phone || order.shippingAddress
        ? (order.shippingAddress as any).phone
        : "",
      shippingAddress: order.shippingAddress
        ? {
            address: (order.shippingAddress as any).address || "",
            city: (order.shippingAddress as any).city || "",
            province: (order.shippingAddress as any).province || "",
            postalCode: (order.shippingAddress as any).postalCode || "",
          }
        : { address: "", city: "", province: "", postalCode: "" },
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.images
          ? JSON.parse(item.product.images)[0]
          : "/placeholder.jpg",
        quantity: item.quantity,
        price: Number(item.priceAtTimeOfPurchase),
        sku: item.product.sku,
      })),
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      stitchingFee: Number(order.stitchingFee),
      discount: Number(order.discountAmount || 0),
      total: Number(order.grandTotal),
      status: order.status.toLowerCase() as
        | "pending"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "returned",
      paymentStatus: order.paymentStatus.toLowerCase() as
        | "pending"
        | "paid"
        | "refunded"
        | "failed",
      paymentMethod: order.paymentMethod.toLowerCase() as
        | "cod"
        | "jazzcash"
        | "easypaisa"
        | "card"
        | "safepay",
      notes: order.notes || undefined,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}

export async function updateOrderStatus(id: string, status: string) {
  const order = await prisma.$transaction(async (tx) => { // A4.2: transaction for stock restoration
    const updated = await tx.order.update({
      where: { id },
      data: { status: status as any },
      include: { items: { include: { product: true } }, user: true },
    });

    // A4.2: Restore stock when cancelling an order
    if (status === "CANCELLED") {
      for (const item of updated.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { 
            stockQuantity: { increment: item.quantity },
            inStock: true, // BUG FIX: Ensure the product is marked back in stock
          },
        });
      }
    }

    return updated;
  });

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerId: order.user?.id || "guest",
    customerName: order.user?.name || "Guest",
    customerEmail: order.user?.email || "",
    customerPhone: order.user?.phone || "",
    shippingAddress: order.shippingAddress
      ? {
          address: (order.shippingAddress as any).address || "",
          city: (order.shippingAddress as any).city || "",
          province: (order.shippingAddress as any).province || "",
          postalCode: (order.shippingAddress as any).postalCode || "",
        }
      : { address: "", city: "", province: "", postalCode: "" },
    items: order.items.map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      productImage: item.product.images
        ? JSON.parse(item.product.images)[0]
        : "/placeholder.jpg",
      quantity: item.quantity,
      price: Number(item.priceAtTimeOfPurchase),
      sku: item.product.sku,
    })),
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shippingCost),
    discount: 0,
    total: Number(order.grandTotal),
    status: order.status.toLowerCase() as any,
    paymentStatus: order.paymentStatus.toLowerCase() as any,
    paymentMethod: order.paymentMethod.toLowerCase() as any,
    notes: order.notes || undefined,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export async function getAdminProducts() {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: "desc" },
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
      images: p.images ? JSON.parse(p.images) : [],
      videoUrl: p.videoUrl || undefined,
      badge: p.badge ? badgeMap[p.badge] : undefined,
      inStock: p.inStock,
      stockQuantity: p.stockQuantity,
      lowStockThreshold: p.lowStockThreshold,
      description: p.description,
      longDescription: p.longDescription || "",
      categoryId: p.categoryId,
      slug: p.slug || p.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      tags: p.tags ? JSON.parse(p.tags) : [],
      metaTitle: p.metaTitle || undefined,
      metaDescription: p.metaDescription || undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
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
    images: product.images ? JSON.parse(product.images) : [],
    videoUrl: product.videoUrl || undefined,
    badge: product.badge ? badgeMap[product.badge] : undefined,
    inStock: product.inStock,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
    description: product.description,
    longDescription: product.longDescription || "",
    slug: product.slug || product.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    tags: product.tags ? JSON.parse(product.tags) : [],
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
    images: product.images ? JSON.parse(product.images) : [],
    videoUrl: product.videoUrl || undefined,
    badge: product.badge ? badgeMap[product.badge] : undefined,
    inStock: product.inStock,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
    description: product.description,
    longDescription: product.longDescription || "",
    slug: product.slug || product.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    tags: product.tags ? JSON.parse(product.tags) : [],
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
    images: p.images ? JSON.parse(p.images) : [],
    videoUrl: p.videoUrl || undefined,
    badge: p.badge ? badgeMap[p.badge] : undefined,
    inStock: p.inStock,
    stockQuantity: p.stockQuantity,
    lowStockThreshold: p.lowStockThreshold,
    description: p.description,
    longDescription: p.longDescription || "",
    slug: p.slug || p.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    tags: p.tags ? JSON.parse(p.tags) : [],
    metaTitle: p.metaTitle || undefined,
    metaDescription: p.metaDescription || undefined,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export async function getAdminProductsWithStock() {
  const products = await prisma.product.findMany({
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
    images: p.images ? JSON.parse(p.images) : [],
    videoUrl: p.videoUrl || undefined,
    badge: p.badge ? badgeMap[p.badge] : undefined,
    inStock: p.inStock,
    stockQuantity: p.stockQuantity,
    lowStockThreshold: p.lowStockThreshold,
    description: p.description,
    longDescription: p.longDescription || "",
    slug: p.slug || p.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    tags: p.tags ? JSON.parse(p.tags) : [],
    metaTitle: p.metaTitle || undefined,
    metaDescription: p.metaDescription || undefined,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export async function getAdminCustomers() {
  const users = await prisma.user.findMany({
    include: { addresses: true },
    orderBy: { createdAt: "desc" },
  });

  // Use aggregation instead of loading all orders (M3)
  const userIds = users.map((u) => u.id);
  const orderAgg = await prisma.order.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds } },
    _sum: { grandTotal: true },
    _max: { createdAt: true },
    _count: { id: true },
  });
  const aggMap = new Map(orderAgg.map((a) => [a.userId!, a]));

  return users.map((user) => {
    const agg = aggMap.get(user.id);
    const totalOrders = agg?._count.id ?? 0;
    const totalSpent = Number(agg?._sum.grandTotal ?? 0);
    const lastOrderDate = agg?._max.createdAt
      ? agg._max.createdAt.toISOString().split("T")[0]
      : user.createdAt.toISOString().split("T")[0];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      city: user.addresses.find((a) => a.isDefault)?.city || "Unknown",
      totalOrders,
      totalSpent,
      lastOrderDate,
      status: "active" as const,
      createdAt: user.createdAt.toISOString().split("T")[0],
    };
  });
}

export async function getAdminAnalytics() {
  const [
    revenueAgg,
    ordersCount,
    customersCount,
    pendingOrdersCount,
    pendingReturnRequestsCount,
    recentOrders,
    reviewStats,
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: { grandTotal: true },
      _avg: { grandTotal: true },
    }),
    prisma.order.count(),
    prisma.user.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.returnRequest.count({ where: { status: "PENDING" } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: true } }, user: true },
    }),
    prisma.productReview.aggregate({
      _avg: { rating: true },
      _count: { id: true },
      where: { isVisible: true, deletedAt: null },
    }),
  ]);

  const totalRevenue = Number(revenueAgg._sum.grandTotal || 0);
  const avgOrderValue = Number(revenueAgg._avg.grandTotal || 0);
  const totalReviews = reviewStats._count.id || 0;
  const averageRating = Number(reviewStats._avg.rating?.toFixed(1) || 0);

  return {
    totalRevenue,
    revenueChange: 0,
    totalOrders: ordersCount,
    ordersChange: 0,
    totalCustomers: customersCount,
    customersChange: 0,
    averageOrderValue: avgOrderValue,
    aovChange: 0,
    pendingOrders: pendingOrdersCount,
    lowStockItems: await prisma.product.count({
      where: {
        AND: [
          { stockQuantity: { lte: 5 } },
          { stockQuantity: { gt: 0 } },
        ],
      },
    }),
    returnRequests: pendingReturnRequestsCount,
    totalReviews,
    averageRating,
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.user?.name || "Guest",
      customerEmail: order.user?.email || "",
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.images
          ? JSON.parse(item.product.images)[0]
          : "/placeholder.jpg",
        quantity: item.quantity,
        price: Number(item.priceAtTimeOfPurchase),
        sku: item.product.sku,
      })),
      total: Number(order.grandTotal),
      status: order.status.toLowerCase() as any,
      createdAt: order.createdAt.toISOString(),
    })),
  };
}

export async function getAdminAlertCounts() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [newOrdersAgg, pendingReturnsAgg, lowStockAgg, backlogOrdersAgg] = await Promise.all([
    prisma.order.aggregate({
      _count: { id: true },
      _max: { createdAt: true },
      where: { createdAt: { gte: oneHourAgo } }
    }),
    prisma.returnRequest.aggregate({
      _count: { id: true },
      _max: { createdAt: true },
      where: { status: "PENDING" }
    }),
    prisma.product.aggregate({
      _count: { id: true },
      _max: { updatedAt: true },
      where: {
        AND: [
          { inStock: true },
          { stockQuantity: { lte: 5 } },
        ],
      },
    }),
    prisma.order.aggregate({
      _count: { id: true },
      _max: { createdAt: true },
      where: {
        AND: [
          { status: "PENDING" },
          { createdAt: { lte: twentyFourHoursAgo } },
        ],
      },
    }),
  ]);

  const newOrders = newOrdersAgg._count.id;
  const pendingReturns = pendingReturnsAgg._count.id;
  const lowStockProducts = lowStockAgg._count.id;
  const backlogOrders = backlogOrdersAgg._count.id;

  return {
    newOrders,
    newOrdersLatest: newOrdersAgg._max.createdAt?.toISOString() || null,
    pendingReturns,
    pendingReturnsLatest: pendingReturnsAgg._max.createdAt?.toISOString() || null,
    lowStockProducts,
    lowStockLatest: lowStockAgg._max.updatedAt?.toISOString() || null,
    backlogOrders,
    backlogOrdersLatest: backlogOrdersAgg._max.createdAt?.toISOString() || null,
    total: newOrders + pendingReturns + lowStockProducts + backlogOrders,
  };
}

// ── Payment Transaction helpers ───────────────────────────────────

export async function createPaymentTransaction(data: {
  orderId: string;
  provider: string;
  amount: number;
  currency?: string;
  transactionRef?: string;
  status?: string;
}) {
  const tx = await prisma.paymentTransaction.create({
    data: {
      orderId: data.orderId,
      provider: data.provider.toUpperCase() as any,
      amount: data.amount,
      currency: data.currency || "PKR",
      transactionRef: data.transactionRef || null,
      status: (data.status || "PENDING") as any,
    },
  });
  return {
    id: tx.id,
    orderId: tx.orderId,
    provider: tx.provider,
    amount: Number(tx.amount),
    currency: tx.currency,
    transactionRef: tx.transactionRef,
    status: tx.status,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
}

export async function updatePaymentTransaction(
  id: string,
  data: {
    status?: string;
    gatewayResponse?: unknown;
    failureReason?: string;
    transactionRef?: string;
  }
) {
  const tx = await prisma.paymentTransaction.update({
    where: { id },
    data: {
      status: data.status as any,
      gatewayResponse: data.gatewayResponse ? JSON.stringify(data.gatewayResponse) : undefined,
      failureReason: data.failureReason,
      transactionRef: data.transactionRef,
    },
  });
  return {
    id: tx.id,
    orderId: tx.orderId,
    provider: tx.provider,
    amount: Number(tx.amount),
    currency: tx.currency,
    transactionRef: tx.transactionRef,
    status: tx.status,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
}

export async function getPaymentTransactionByOrderId(orderId: string) {
  const tx = await prisma.paymentTransaction.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });
  if (!tx) return null;
  return {
    id: tx.id,
    orderId: tx.orderId,
    provider: tx.provider,
    amount: Number(tx.amount),
    currency: tx.currency,
    transactionRef: tx.transactionRef,
    status: tx.status,
    gatewayResponse: tx.gatewayResponse,
    failureReason: tx.failureReason,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
}

export async function getPaymentTransactionsByOrderId(orderId: string) {
  const txs = await prisma.paymentTransaction.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });
  return txs.map((tx) => ({
    id: tx.id,
    orderId: tx.orderId,
    provider: tx.provider,
    amount: Number(tx.amount),
    currency: tx.currency,
    transactionRef: tx.transactionRef,
    status: tx.status,
    gatewayResponse: tx.gatewayResponse,
    failureReason: tx.failureReason,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  }));
}

export async function updateOrderPaymentStatus(
  orderId: string,
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED"
) {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: status },
  });
  return {
    id: order.id,
    paymentStatus: order.paymentStatus,
    updatedAt: order.updatedAt.toISOString(),
  };
}

// ── Notification Log helpers ─────────────────────────────────────

export async function createNotificationLog(data: {
  orderId: string;
  channel: string;
  template: string;
  recipient: string;
  subject?: string | null;
  content?: string | null;
  status?: string;
  providerRef?: string | null;
  errorMessage?: string | null;
}) {
  const log = await prisma.notificationLog.create({
    data: {
      orderId: data.orderId,
      channel: data.channel,
      template: data.template,
      recipient: data.recipient,
      subject: data.subject ?? null,
      content: data.content ?? null,
      status: data.status || "pending",
      providerRef: data.providerRef ?? null,
      errorMessage: data.errorMessage ?? null,
    },
  });
  return {
    id: log.id,
    orderId: log.orderId,
    channel: log.channel,
    template: log.template,
    recipient: log.recipient,
    status: log.status,
    providerRef: log.providerRef,
    errorMessage: log.errorMessage,
    createdAt: log.createdAt.toISOString(),
  };
}

export async function getNotificationLogsByOrderId(orderId: string) {
  const logs = await prisma.notificationLog.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });
  return logs.map((log) => ({
    id: log.id,
    orderId: log.orderId,
    channel: log.channel,
    template: log.template,
    recipient: log.recipient,
    subject: log.subject,
    content: log.content,
    status: log.status,
    providerRef: log.providerRef,
    errorMessage: log.errorMessage,
    createdAt: log.createdAt.toISOString(),
  }));
}

// ── Discount helpers ─────────────────────────────────────────────

export interface CreateDiscountInput {
  code: string;
  type: "percentage" | "fixed" | "buy_x_get_y";
  value: number;
  buyQuantity?: number;
  getQuantity?: number;
  productIds?: string[];
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  startDate: string | Date | null;
  endDate: string | Date | null;
  isActive?: boolean;
}

export interface UpdateDiscountInput {
  code?: string;
  type?: "percentage" | "fixed" | "buy_x_get_y";
  value?: number;
  buyQuantity?: number;
  getQuantity?: number;
  productIds?: string[];
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  isActive?: boolean;
}

function mapDiscountFromDb(d: any) {
  return {
    id: d.id,
    code: d.code,
    type: d.type as "percentage" | "fixed" | "buy_x_get_y",
    value: d.value,
    buyQuantity: d.buyQuantity ?? undefined,
    getQuantity: d.getQuantity ?? undefined,
    productIds: d.productIds ? (JSON.parse(d.productIds) as string[]) : [],
    minPurchase: d.minPurchase ?? undefined,
    maxDiscount: d.maxDiscount ?? undefined,
    usageLimit: d.usageLimit ?? undefined,
    usageCount: d.usageCount,
    startDate: d.startDate ? d.startDate.toISOString() : "",
    endDate: d.endDate ? d.endDate.toISOString() : "",
    isActive: d.isActive,
  };
}

/** All discounts for admin (no date filtering) */
export async function getDiscounts() {
  const discounts = await prisma.discount.findMany({
    orderBy: { createdAt: "desc" },
  });
  return discounts.map(mapDiscountFromDb);
}

/** Only currently active discounts (for storefront) */
export async function getActiveDiscounts() {
  const now = new Date();
  const discounts = await prisma.discount.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  return discounts.map(mapDiscountFromDb);
}

export async function getDiscountByCode(code: string) {
  const discount = await prisma.discount.findUnique({
    where: { code: code.toUpperCase() },
  });
  if (!discount) return null;
  return mapDiscountFromDb(discount);
}

export async function createDiscount(data: CreateDiscountInput) {
  const discount = await prisma.discount.create({
    data: {
      code: data.code.toUpperCase(),
      type: data.type,
      value: data.value,
      buyQuantity: data.buyQuantity ?? null,
      getQuantity: data.getQuantity ?? null,
      productIds: data.productIds ? JSON.stringify(data.productIds) : "[]",
      minPurchase: data.minPurchase ?? null,
      maxDiscount: data.maxDiscount ?? null,
      usageLimit: data.usageLimit ?? null,
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: data.isActive ?? true,
    },
  });
  return mapDiscountFromDb(discount);
}

export async function updateDiscount(id: string, data: UpdateDiscountInput) {
  const updateData: any = {};
  if (data.code !== undefined) updateData.code = data.code.toUpperCase();
  if (data.type !== undefined) updateData.type = data.type;
  if (data.value !== undefined) updateData.value = data.value;
  if (data.buyQuantity !== undefined) updateData.buyQuantity = data.buyQuantity;
  if (data.getQuantity !== undefined) updateData.getQuantity = data.getQuantity;
  if (data.productIds !== undefined) updateData.productIds = JSON.stringify(data.productIds);
  if (data.minPurchase !== undefined) updateData.minPurchase = data.minPurchase;
  if (data.maxDiscount !== undefined) updateData.maxDiscount = data.maxDiscount;
  if (data.usageLimit !== undefined) updateData.usageLimit = data.usageLimit;
  if (data.startDate !== undefined) updateData.startDate = data.startDate;
  if (data.endDate !== undefined) updateData.endDate = data.endDate;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const discount = await prisma.discount.update({
    where: { id },
    data: updateData,
  });
  return mapDiscountFromDb(discount);
}

export async function deleteDiscount(id: string) {
  const discount = await prisma.discount.update({
    where: { id },
    data: { isActive: false },
  });
  return mapDiscountFromDb(discount);
}

export async function incrementDiscountUsage(id: string) {
  const discount = await prisma.discount.update({
    where: { id },
    data: { usageCount: { increment: 1 } },
  });
  return {
    id: discount.id,
    code: discount.code,
    usageCount: discount.usageCount,
  };
}

// ── Store Config helpers ─────────────────────────────────────────

export interface StoreConfigInput {
  name?: string;
  tagline?: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  address?: string;
  currency?: string;
  timezone?: string;
  instagram_url?: string;
  facebook_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
  freeShippingThreshold?: number;
  standardShippingRate?: number;
  expressShippingRate?: number;
  enableCOD?: boolean;
  orderConfirmation?: boolean;
  orderShipped?: boolean;
  orderDelivered?: boolean;
  lowStockAlert?: boolean;
  newOrderAlert?: boolean;
  returnRequest?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  googleAnalyticsId?: string;
  facebookPixelId?: string;
}

async function _getStoreConfig(): Promise<StoreConfigInput> {
  let rows: { key: string; value: string }[];
  try {
    rows = await prisma.storeConfig.findMany();
  } catch {
    console.warn("[getStoreConfig] Database unreachable, using defaults");
    return {
      name: "Eman Thread",
      tagline: "The Style Never Dies",
      email: "contact@emanthreads.com",
      phone: "+92 300 1234567",
      whatsappNumber: "+92 300 1234567",
      address: "123 Fashion Street, Lahore, Pakistan",
      currency: "PKR",
      timezone: "Asia/Karachi",
      freeShippingThreshold: 5000,
      standardShippingRate: 200,
      expressShippingRate: 500,
      enableCOD: true,
      orderConfirmation: true,
      orderShipped: true,
      orderDelivered: true,
      lowStockAlert: true,
      newOrderAlert: true,
      returnRequest: true,
      metaTitle: "Eman Thread | Premium Men's Unstitched Fabric",
      metaDescription: "Discover premium unstitched fabric for men.",
      googleAnalyticsId: "",
      facebookPixelId: "",
    };
  }
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const parseBool = (key: string, fallback: boolean) => {
    const v = map.get(key);
    return v === undefined ? fallback : v === "true";
  };
  const parseNum = (key: string, fallback: number) => {
    const v = map.get(key);
    return v === undefined ? fallback : Number(v);
  };
  const parseStr = (key: string, fallback: string) => {
    return map.get(key) ?? fallback;
  };

  return {
    name: parseStr("name", "Eman Thread"),
    tagline: parseStr("tagline", "The Style Never Dies"),
    email: parseStr("email", "contact@emanthreads.com"),
    phone: parseStr("phone", "+92 300 1234567"),
    whatsappNumber: parseStr("whatsappNumber", "+92 300 1234567"),
    address: parseStr("address", "123 Fashion Street, Lahore, Pakistan"),
    currency: parseStr("currency", "PKR"),
    timezone: parseStr("timezone", "Asia/Karachi"),
    freeShippingThreshold: parseNum("freeShippingThreshold", 5000),
    standardShippingRate: parseNum("standardShippingRate", 200),
    expressShippingRate: parseNum("expressShippingRate", 500),
    enableCOD: parseBool("enableCOD", true),
    orderConfirmation: parseBool("orderConfirmation", true),
    orderShipped: parseBool("orderShipped", true),
    orderDelivered: parseBool("orderDelivered", true),
    lowStockAlert: parseBool("lowStockAlert", true),
    newOrderAlert: parseBool("newOrderAlert", true),
    returnRequest: parseBool("returnRequest", true),
    metaTitle: parseStr("metaTitle", "Eman Thread | Premium Men's Unstitched Fabric"),
    metaDescription: parseStr("metaDescription", "Discover premium unstitched fabric for men."),
    instagram_url: parseStr("instagram_url", ""),
    facebook_url: parseStr("facebook_url", ""),
    youtube_url: parseStr("youtube_url", ""),
    tiktok_url: parseStr("tiktok_url", ""),
    googleAnalyticsId: parseStr("googleAnalyticsId", ""),
    facebookPixelId: parseStr("facebookPixelId", ""),
  };
}

export const getStoreConfig = unstable_cache(_getStoreConfig, ["store-config"], { revalidate: 300, tags: ["store-config"] }); // M4

export async function setStoreConfig(data: StoreConfigInput) {
  const entries: [string, string][] = [];
  if (data.name !== undefined) entries.push(["name", data.name]);
  if (data.tagline !== undefined) entries.push(["tagline", data.tagline]);
  if (data.email !== undefined) entries.push(["email", data.email]);
  if (data.phone !== undefined) entries.push(["phone", data.phone]);
  if (data.whatsappNumber !== undefined) entries.push(["whatsappNumber", data.whatsappNumber]);
  if (data.address !== undefined) entries.push(["address", data.address]);
  if (data.currency !== undefined) entries.push(["currency", data.currency]);
  if (data.timezone !== undefined) entries.push(["timezone", data.timezone]);
  if (data.freeShippingThreshold !== undefined) entries.push(["freeShippingThreshold", String(data.freeShippingThreshold)]);
  if (data.standardShippingRate !== undefined) entries.push(["standardShippingRate", String(data.standardShippingRate)]);
  if (data.expressShippingRate !== undefined) entries.push(["expressShippingRate", String(data.expressShippingRate)]);
  if (data.enableCOD !== undefined) entries.push(["enableCOD", String(data.enableCOD)]);
  if (data.orderConfirmation !== undefined) entries.push(["orderConfirmation", String(data.orderConfirmation)]);
  if (data.orderShipped !== undefined) entries.push(["orderShipped", String(data.orderShipped)]);
  if (data.orderDelivered !== undefined) entries.push(["orderDelivered", String(data.orderDelivered)]);
  if (data.lowStockAlert !== undefined) entries.push(["lowStockAlert", String(data.lowStockAlert)]);
  if (data.newOrderAlert !== undefined) entries.push(["newOrderAlert", String(data.newOrderAlert)]);
  if (data.returnRequest !== undefined) entries.push(["returnRequest", String(data.returnRequest)]);
  if (data.metaTitle !== undefined) entries.push(["metaTitle", data.metaTitle]);
  if (data.metaDescription !== undefined) entries.push(["metaDescription", data.metaDescription]);
  if (data.instagram_url !== undefined) entries.push(["instagram_url", data.instagram_url]);
  if (data.facebook_url !== undefined) entries.push(["facebook_url", data.facebook_url]);
  if (data.youtube_url !== undefined) entries.push(["youtube_url", data.youtube_url]);
  if (data.tiktok_url !== undefined) entries.push(["tiktok_url", data.tiktok_url]);
  if (data.googleAnalyticsId !== undefined) entries.push(["googleAnalyticsId", data.googleAnalyticsId]);
  if (data.facebookPixelId !== undefined) entries.push(["facebookPixelId", data.facebookPixelId]);

  await Promise.all(
    entries.map(([key, value]) =>
      prisma.storeConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );

  // M4: Invalidate the unstable_cache so the next request gets the new settings
  // @ts-expect-error - Next.js 16 requires 2 arguments for revalidateTag in some configs
  revalidateTag("store-config", undefined);
}

function getPeriodRange(timeRange: string) {
  const now = new Date();
  let startDate: Date;
  let prevStartDate: Date;

  switch (timeRange) {
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "1y":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(startDate.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return { startDate, prevStartDate };
}

// ── Dashboard Analytics helpers ──────────────────────────────────

export async function getRevenueOverview(timeRange: string) {
  const now = new Date();
  let startDate: Date;

  switch (timeRange) {
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "1y":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: startDate },
      status: { not: "CANCELLED" },
    },
    select: {
      grandTotal: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const monthMap = new Map<string, number>();
  orders.forEach((o) => {
    const month = o.createdAt.toISOString().slice(0, 7);
    monthMap.set(month, (monthMap.get(month) || 0) + Number(o.grandTotal));
  });

  const sorted = Array.from(monthMap.entries()).sort();
  return sorted.map(([month, revenue]) => ({
    month: month.slice(5),
    revenue,
  }));
}

export async function getTopProducts(limit: number = 5) {
  const items = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true, priceAtTimeOfPurchase: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, images: true },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  return items.map((item) => {
    const p = productMap.get(item.productId);
    return {
      name: p?.name || "Unknown Product",
      sales: item._sum.quantity || 0,
      revenue: Number(item._sum.priceAtTimeOfPurchase || 0),
      image: p?.images ? JSON.parse(p.images)[0] : "/placeholder.jpg",
    };
  });
}

export async function getAdminAnalyticsDetail(timeRange: string, fromDate?: string, toDate?: string) {
  let startDate: Date;
  let prevStartDate: Date;

  if (fromDate && toDate) {
    startDate = new Date(fromDate);
    // end of toDate
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);
    const diffMs = endDate.getTime() - startDate.getTime();
    prevStartDate = new Date(startDate.getTime() - diffMs);
  } else {
    const range = getPeriodRange(timeRange);
    startDate = range.startDate;
    prevStartDate = range.prevStartDate;
  }

  // Current period orders (non-cancelled) — M5: removed items include, use aggregation instead
  const currentOrders = await prisma.order.findMany({
    where: {
      createdAt: { gte: startDate },
      status: { not: "CANCELLED" },
    },
    select: {
      id: true,
      grandTotal: true,
      createdAt: true,
      shippingAddress: true,
    },
  });

  // Previous period orders (for change calculation)
  const prevOrders = await prisma.order.findMany({
    where: {
      createdAt: { gte: prevStartDate, lt: startDate },
      status: { not: "CANCELLED" },
    },
    select: { grandTotal: true },
  });

  // Overview stats
  const currentRevenue = currentOrders.reduce((s, o) => s + Number(o.grandTotal), 0);
  const prevRevenue = prevOrders.reduce((s, o) => s + Number(o.grandTotal), 0);
  const totalOrders = currentOrders.length;
  const prevOrdersCount = prevOrders.length;
  const totalCustomers = await prisma.user.count({
    where: { createdAt: { lte: startDate } },
  });
  const prevCustomers = await prisma.user.count({
    where: { createdAt: { gte: prevStartDate, lt: startDate } },
  });

  const avgOrderValue = totalOrders > 0 ? currentRevenue / totalOrders : 0;
  const prevAvgOrderValue = prevOrdersCount > 0 ? prevRevenue / prevOrdersCount : 0;

  const calcChange = (curr: number, prev: number) =>
    prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : 0;

  // Sales by category — M5: use aggregation instead of loading all order items
  const categoryAgg = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      order: {
        createdAt: { gte: startDate },
        status: { not: "CANCELLED" },
      },
    },
    _sum: { priceAtTimeOfPurchase: true, quantity: true },
  });

  const catProductIds = categoryAgg.map((c) => c.productId);
  const catProducts = await prisma.product.findMany({
    where: { id: { in: catProductIds } },
    select: { id: true, fabricType: true, category: { select: { name: true } } },
  });
  const catProductMap = new Map(catProducts.map((p) => [p.id, p]));

  const categoryMap = new Map<string, number>();
  for (const agg of categoryAgg) {
    const p = catProductMap.get(agg.productId);
    const catName = p?.category?.name || p?.fabricType || "Other";
    categoryMap.set(catName, (categoryMap.get(catName) || 0) + Number(agg._sum.priceAtTimeOfPurchase ?? 0));
  }
  const totalCatRevenue = Array.from(categoryMap.values()).reduce((s, v) => s + v, 0) || 1;
  const salesByCategory = Array.from(categoryMap.entries())
    .map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / totalCatRevenue) * 100),
    }))
    .sort((a, b) => b.value - a.value);

  // Top cities from shipping addresses
  const cityMap = new Map<string, { orders: number; revenue: number }>();
  for (const order of currentOrders) {
    const addr = order.shippingAddress as any;
    const city = addr?.city || "Unknown";
    const entry = cityMap.get(city) || { orders: 0, revenue: 0 };
    entry.orders += 1;
    entry.revenue += Number(order.grandTotal);
    cityMap.set(city, entry);
  }
  const topCities = Array.from(cityMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Traffic sources from PageView referrers
  let trafficSources: { name: string; count: number; percentage: number }[] = [];
  try {
    const pageViews = await prisma.pageView.findMany({
      where: { createdAt: { gte: startDate } },
      select: { referrer: true, utmSource: true },
    });

    const sourceMap = new Map<string, number>();
    let totalViews = pageViews.length;

    for (const pv of pageViews) {
      let source = "Direct";
      const ref = pv.referrer?.toLowerCase() || "";
      const utm = pv.utmSource?.toLowerCase();

      if (utm) {
        source = utm.charAt(0).toUpperCase() + utm.slice(1);
      } else if (ref.includes("google")) {
        source = "Google";
      } else if (ref.includes("facebook") || ref.includes("fb.com")) {
        source = "Facebook";
      } else if (ref.includes("instagram")) {
        source = "Instagram";
      } else if (ref.includes("twitter") || ref.includes("x.com")) {
        source = "Twitter";
      } else if (ref.includes("linkedin")) {
        source = "LinkedIn";
      } else if (ref.includes("pinterest")) {
        source = "Pinterest";
      } else if (ref.includes("youtube")) {
        source = "YouTube";
      } else if (ref && ref !== "direct") {
        source = "Other";
      }

      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    }

    trafficSources = Array.from(sourceMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  } catch {
    // PageView table may not exist yet — gracefully return empty traffic sources
  }

  // Daily revenue for chart (last 7 days worth, or bucket by period)
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayMap = new Map<string, number>();
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const order of currentOrders) {
    const day = order.createdAt.toISOString().slice(0, 10);
    if (dayMap.has(day)) {
      dayMap.set(day, (dayMap.get(day) || 0) + Number(order.grandTotal));
    }
  }
  const dailyRevenue = Array.from(dayMap.entries()).map(([dateStr, revenue], i) => ({
    day: dayLabels[i] || new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" }),
    revenue,
  }));

  return {
    overviewStats: {
      revenue: { value: currentRevenue, change: calcChange(currentRevenue, prevRevenue) },
      orders: { value: totalOrders, change: calcChange(totalOrders, prevOrdersCount) },
      customers: { value: totalCustomers, change: calcChange(totalCustomers, prevCustomers) },
      conversion: { value: totalOrders > 0 ? Math.round((totalOrders / Math.max(totalCustomers, 1)) * 1000) / 10 : 0, change: 0 },
    },
    trafficSources,
    salesByCategory,
    topCities,
    dailyRevenue,
  };
}

// ── Return Request helpers ───────────────────────────────────────

export interface CreateReturnRequestInput {
  orderId: string;
  type: "REFUND" | "EXCHANGE";
  reason: "SIZE" | "QUALITY" | "WRONG_ITEM" | "DAMAGED" | "OTHER";
  notes?: string;
  items: {
    orderItemId: string;
    quantity: number;
    reason?: "SIZE" | "QUALITY" | "WRONG_ITEM" | "DAMAGED" | "OTHER";
  }[];
}

export interface UpdateReturnRequestStatusInput {
  status: "APPROVED" | "REJECTED" | "COMPLETED" | "PENDING" | "CANCELLED";
  refundAmount?: number;
  notes?: string;
}

export interface UpdateReturnRequestInput {
  type?: "REFUND" | "EXCHANGE";
  reason?: "SIZE" | "QUALITY" | "WRONG_ITEM" | "DAMAGED" | "OTHER";
  notes?: string;
  refundAmount?: number;
}

export async function createReturnRequest(data: CreateReturnRequestInput) {
  const returnRequest = await prisma.$transaction(async (tx) => {
    // Verify order exists and is delivered
    const order = await tx.order.findUnique({
      where: { id: data.orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order) {
      throw new Error("Order not found");
    }
    if (order.status !== "DELIVERED") {
      throw new Error("Order must be delivered to request a return");
    }

    // Validate all items exist in the order
    const orderItemIds = new Set(order.items.map((item) => item.id));
    for (const item of data.items) {
      if (!orderItemIds.has(item.orderItemId)) {
        throw new Error(`Invalid order item: ${item.orderItemId}`);
      }
    }

    const created = await tx.returnRequest.create({
      data: {
        orderId: data.orderId,
        userId: order.userId,
        type: data.type,
        reason: data.reason as any,
        notes: data.notes || null,
        items: {
          create: data.items.map((item) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            reason: (item.reason || data.reason) as any,
          })),
        },
      },
      include: {
        order: true,
        user: true,
        items: {
          include: {
            returnRequest: false,
          },
        },
      },
    });

    return created;
  });

  return transformReturnRequest(returnRequest);
}

export async function getReturnRequestsByUser(userId: string) {
  const requests = await prisma.returnRequest.findMany({
    where: { userId },
    include: {
      order: true,
      user: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return requests.map(transformReturnRequest);
}

export async function getAdminReturnRequests(options: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { status, search, page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status && status !== "all") {
    where.status = status.toUpperCase();
  }
  if (search) {
    where.OR = [
      { order: { orderNumber: { contains: search, mode: "insensitive" } } },
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [requests, total] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      include: {
        order: true,
        user: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.returnRequest.count({ where }),
  ]);

  return {
    returnRequests: requests.map(transformReturnRequest),
    total,
    page,
    limit,
  };
}

export async function getReturnRequestById(id: string) {
  const request = await prisma.returnRequest.findUnique({
    where: { id },
    include: {
      order: { include: { items: { include: { product: true } } } },
      user: true,
      items: true,
    },
  });

  if (!request) return null;

  return transformReturnRequestWithOrderItems(request);
}

export async function updateReturnRequestStatus(
  id: string,
  data: UpdateReturnRequestStatusInput,
  adminId: string
) {
  const updateData: any = { status: data.status };
  if (data.status === "APPROVED") {
    updateData.approvedBy = adminId;
    updateData.approvedAt = new Date();
  }
  if (data.status === "PENDING") {
    updateData.approvedBy = null;
    updateData.approvedAt = null;
  }
  if (data.refundAmount !== undefined) {
    updateData.refundAmount = data.refundAmount;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const request = await tx.returnRequest.update({
      where: { id },
      data: updateData,
      include: {
        order: true,
        user: true,
        items: true,
      },
    });

    // If completed and type is REFUND, update order payment status
    if (data.status === "COMPLETED" && request.type === "REFUND") {
      await tx.order.update({
        where: { id: request.orderId },
        data: { paymentStatus: "REFUNDED" },
      });
    }

    return request;
  });

  return transformReturnRequest(updated);
}

export async function getPendingReturnRequestCount() {
  return prisma.returnRequest.count({ where: { status: "PENDING" } });
}

export async function updateReturnRequest(
  id: string,
  data: UpdateReturnRequestInput
) {
  const updateData: any = {};
  if (data.type !== undefined) updateData.type = data.type;
  if (data.reason !== undefined) updateData.reason = data.reason;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.refundAmount !== undefined) updateData.refundAmount = data.refundAmount;

  const updated = await prisma.returnRequest.update({
    where: { id },
    data: updateData,
    include: {
      order: true,
      user: true,
      items: true,
    },
  });

  return transformReturnRequest(updated);
}

export async function deleteReturnRequest(id: string) {
  await prisma.returnRequest.delete({
    where: { id },
  });
}

// ── Internal transformers ────────────────────────────────────────

function transformReturnRequest(req: any) {
  return {
    id: req.id,
    orderId: req.orderId,
    orderNumber: req.order?.orderNumber || "",
    customerId: req.user?.id || "guest",
    customerName: req.user?.name || "Guest",
    customerEmail: req.user?.email || "",
    status: req.status.toLowerCase() as
      | "pending"
      | "approved"
      | "rejected"
      | "completed"
      | "cancelled",
    type: req.type.toLowerCase() as "refund" | "exchange",
    reason: req.reason,
    notes: req.notes || undefined,
    items: req.items.map((item: any) => ({
      id: item.id,
      orderItemId: item.orderItemId,
      quantity: item.quantity,
      reason: item.reason || undefined,
      condition: item.condition || undefined,
    })),
    refundAmount: req.refundAmount ? Number(req.refundAmount) : undefined,
    approvedBy: req.approvedBy || undefined,
    approvedAt: req.approvedAt?.toISOString() || undefined,
    createdAt: req.createdAt.toISOString(),
    updatedAt: req.updatedAt.toISOString(),
  };
}

function transformReturnRequestWithOrderItems(req: any) {
  const base = transformReturnRequest(req);
  return {
    ...base,
    orderItems:
      req.order?.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.images
          ? JSON.parse(item.product.images)[0]
          : "/placeholder.jpg",
        quantity: item.quantity,
        price: Number(item.priceAtTimeOfPurchase),
        sku: item.product.sku,
      })) || [],
  };
}

// ── Shipping Zone helpers ──────────────────────────────────────────

export async function getShippingZones() {
  const zones = await prisma.shippingZone.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return zones.map((z) => ({
    id: z.id,
    name: z.name,
    cities: z.cities ? JSON.parse(z.cities) as string[] : [],
    provinces: z.provinces ? JSON.parse(z.provinces) as string[] : [],
    shippingRate: Number(z.shippingRate),
    estimatedDays: z.estimatedDays,
    isActive: z.isActive,
    createdAt: z.createdAt.toISOString(),
  }));
}

export async function getAllShippingZones() {
  const zones = await prisma.shippingZone.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  return zones.map((z) => ({
    id: z.id,
    name: z.name,
    cities: z.cities ? JSON.parse(z.cities) as string[] : [],
    provinces: z.provinces ? JSON.parse(z.provinces) as string[] : [],
    shippingRate: Number(z.shippingRate),
    estimatedDays: z.estimatedDays,
    isActive: z.isActive,
    createdAt: z.createdAt.toISOString(),
  }));
}

export async function getZoneForCity(city: string, province: string) {
  const normalizedCity = city.trim().toLowerCase();
  const normalizedProvince = province.trim().toLowerCase();

  // Find all active zones
  const zones = await prisma.shippingZone.findMany({
    where: { isActive: true },
  });

  // Try exact city match first
  for (const zone of zones) {
    const cities: string[] = zone.cities ? JSON.parse(zone.cities) : [];
    if (cities.includes(normalizedCity)) {
      return {
        id: zone.id,
        name: zone.name,
        shippingRate: Number(zone.shippingRate),
        estimatedDays: zone.estimatedDays,
      };
    }
  }

  // Try province match
  for (const zone of zones) {
    const provinces: string[] = zone.provinces ? JSON.parse(zone.provinces) : [];
    if (provinces.includes(normalizedProvince)) {
      return {
        id: zone.id,
        name: zone.name,
        shippingRate: Number(zone.shippingRate),
        estimatedDays: zone.estimatedDays,
      };
    }
  }

  // Fallback to default zone (Rest of Pakistan — should have empty cities/provinces arrays)
  const defaultZone = zones.find((z) => {
    const cities: string[] = z.cities ? JSON.parse(z.cities) : [];
    const provinces: string[] = z.provinces ? JSON.parse(z.provinces) : [];
    return cities.length === 0 && provinces.length === 0;
  });

  if (defaultZone) {
    return {
      id: defaultZone.id,
      name: defaultZone.name,
      shippingRate: Number(defaultZone.shippingRate),
      estimatedDays: defaultZone.estimatedDays,
    };
  }

  // Ultimate fallback if no zones exist
  return {
    id: "default",
    name: "Rest of Pakistan",
    shippingRate: 350,
    estimatedDays: "3-5 business days",
  };
}

export async function createShippingZone(data: {
  name: string;
  cities: string[];
  provinces: string[];
  shippingRate: number;
  estimatedDays: string;
  isActive?: boolean;
}) {
  const zone = await prisma.shippingZone.create({
    data: {
      name: data.name,
      cities: JSON.stringify(data.cities.map((c) => c.toLowerCase().trim())),
      provinces: JSON.stringify(data.provinces.map((p) => p.toLowerCase().trim())),
      shippingRate: data.shippingRate,
      estimatedDays: data.estimatedDays,
      isActive: data.isActive ?? true,
    },
  });
  return {
    id: zone.id,
    name: zone.name,
    cities: zone.cities ? JSON.parse(zone.cities) as string[] : [],
    provinces: zone.provinces ? JSON.parse(zone.provinces) as string[] : [],
    shippingRate: Number(zone.shippingRate),
    estimatedDays: zone.estimatedDays,
    isActive: zone.isActive,
    createdAt: zone.createdAt.toISOString(),
  };
}

export async function updateShippingZone(
  id: string,
  data: {
    name?: string;
    cities?: string[];
    provinces?: string[];
    shippingRate?: number;
    estimatedDays?: string;
    isActive?: boolean;
  }
) {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.cities !== undefined) updateData.cities = JSON.stringify(data.cities.map((c) => c.toLowerCase().trim()));
  if (data.provinces !== undefined) updateData.provinces = JSON.stringify(data.provinces.map((p) => p.toLowerCase().trim()));
  if (data.shippingRate !== undefined) updateData.shippingRate = data.shippingRate;
  if (data.estimatedDays !== undefined) updateData.estimatedDays = data.estimatedDays;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const zone = await prisma.shippingZone.update({
    where: { id },
    data: updateData,
  });

  return {
    id: zone.id,
    name: zone.name,
    cities: zone.cities ? JSON.parse(zone.cities) as string[] : [],
    provinces: zone.provinces ? JSON.parse(zone.provinces) as string[] : [],
    shippingRate: Number(zone.shippingRate),
    estimatedDays: zone.estimatedDays,
    isActive: zone.isActive,
    createdAt: zone.createdAt.toISOString(),
  };
}

export async function deleteShippingZone(id: string) {
  await prisma.shippingZone.update({ // FIXED: M9 — soft-delete
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// ── Audit Log helpers ──────────────────────────────────────────────

export function createAuditLog(data: {
  userId?: string;
  userEmail?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: object;
  newValue?: object;
  ipAddress?: string;
  userAgent?: string;
}) {
  after(async () => {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId ?? null,
          userEmail: data.userEmail ?? null,
          action: data.action as any,
          entity: data.entity,
          entityId: data.entityId ?? null,
          oldValue: data.oldValue ? (JSON.parse(JSON.stringify(data.oldValue)) as any) : null,
          newValue: data.newValue ? (JSON.parse(JSON.stringify(data.newValue)) as any) : null,
          ipAddress: data.ipAddress ?? null,
          userAgent: data.userAgent ?? null,
        },
      });
    } catch (err) {
      console.error("[audit] Failed to create audit log:", err);
    }
  });
}

export async function getAuditLogs(options: {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  entity?: string;
  from?: Date;
  to?: Date;
}) {
  const { page = 1, limit = 50, userId, action, entity, from, to } = options;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entity) where.entity = entity;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userEmail: log.userEmail,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      oldValue: log.oldValue,
      newValue: log.newValue,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}

export async function deleteAuditLog(id: string) {
  await prisma.auditLog.delete({ where: { id } });
}

export async function clearAllAuditLogs() {
  await prisma.auditLog.deleteMany();
}

// ── Newsletter helpers ─────────────────────────────────────────────

export async function subscribeToNewsletter(email: string, source?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const subscriber = await prisma.newsletterSubscriber.upsert({
    where: { email: normalizedEmail },
    update: {
      isSubscribed: true,
      unsubscribedAt: null,
    },
    create: {
      email: normalizedEmail,
      source: source || "footer",
      isSubscribed: true,
    },
  });

  return {
    id: subscriber.id,
    email: subscriber.email,
    isSubscribed: subscriber.isSubscribed,
    subscribedAt: subscriber.subscribedAt.toISOString(),
    source: subscriber.source,
  };
}

export async function unsubscribeFromNewsletter(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const subscriber = await prisma.newsletterSubscriber.update({
      where: { email: normalizedEmail },
      data: {
        isSubscribed: false,
        unsubscribedAt: new Date(),
      },
    });

    return {
      id: subscriber.id,
      email: subscriber.email,
      isSubscribed: subscriber.isSubscribed,
      unsubscribedAt: subscriber.unsubscribedAt?.toISOString(),
    };
  } catch (err) {
    return null;
  }
}

export async function getNewsletterSubscribers(options: {
  page?: number;
  limit?: number;
  filter?: "all" | "subscribed";
}) {
  const { page = 1, limit = 20, filter = "all" } = options;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (filter === "subscribed") {
    where.isSubscribed = true;
  }

  const [subscribers, total] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { subscribedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.newsletterSubscriber.count({ where }),
  ]);

  return {
    subscribers: subscribers.map((s) => ({
      id: s.id,
      email: s.email,
      isSubscribed: s.isSubscribed,
      subscribedAt: s.subscribedAt.toISOString(),
      unsubscribedAt: s.unsubscribedAt?.toISOString() || null,
      source: s.source,
    })),
    total,
    page,
    limit,
  };
}

// ── Measurement Profile helpers ────────────────────────────────────

export async function getUserMeasurementProfiles(userId: string) {
  return prisma.measurementProfile.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getMeasurementProfile(id: string, userId: string) {
  return prisma.measurementProfile.findFirst({ where: { id, userId } });
}

export async function createMeasurementProfile(userId: string, data: {
  profileName: string;
  garmentType: string;
  measurements: object;
  stylingPrefs?: object;
  notes?: string;
  isDefault?: boolean;
}) {
  if (data.isDefault) {
    await prisma.measurementProfile.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  return prisma.measurementProfile.create({ data: { userId, ...data } });
}

export async function updateMeasurementProfile(id: string, userId: string, data: Partial<{
  profileName: string;
  garmentType: string;
  measurements: object;
  stylingPrefs: object;
  notes: string;
  isDefault: boolean;
}>) {
  if (data.isDefault) {
    await prisma.measurementProfile.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  return prisma.measurementProfile.update({ where: { id }, data });
}

export async function deleteMeasurementProfile(id: string, userId: string) {
  return prisma.measurementProfile.update({ // FIXED: M9 — soft-delete
    where: { id, userId },
    data: { deletedAt: new Date() },
  });
}

export async function setDefaultMeasurementProfile(id: string, userId: string) {
  await prisma.measurementProfile.updateMany({ where: { userId }, data: { isDefault: false } });
  return prisma.measurementProfile.update({ where: { id }, data: { isDefault: true } });
}

export async function getAdminMeasurementProfiles(page = 1, limit = 20, garmentType?: string, search?: string) {
  const where: any = { deletedAt: null };
  if (garmentType && garmentType !== 'all') {
    where.garmentType = { startsWith: garmentType === 'gents' ? 'male_' : 'female_' };
  }
  if (search) {
    where.OR = [
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { profileName: { contains: search, mode: 'insensitive' } },
    ];
  }
  const [profiles, total] = await Promise.all([
    prisma.measurementProfile.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.measurementProfile.count({ where }),
  ]);
  return { profiles, total, page, limit };
}

export async function adminGetMeasurementProfile(id: string) {
  return prisma.measurementProfile.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export async function adminUpdateMeasurementProfile(id: string, data: object) {
  return prisma.measurementProfile.update({ where: { id }, data });
}

export async function adminDeleteMeasurementProfile(id: string) {
  return prisma.measurementProfile.update({ // FIXED: M9 — soft-delete
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// ── Order Measurement helpers ──────────────────────────────────────

export async function attachMeasurementToOrder(data: {
  orderId: string;
  productId: string;
  productName: string;
  measurementProfileId?: string;
  measurementSnapshot: object;
}) {
  return prisma.orderItemMeasurement.create({ data });
}

export async function getOrderMeasurements(orderId: string) {
  return prisma.orderItemMeasurement.findMany({
    where: { orderId },
    include: { measurementProfile: true },
  });
}

// ── Stitching Order helpers ────────────────────────────────────────

function generateStitchingOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ST-${dateStr}-${random}`;
}

export async function getStitchingOrders(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  tailorName?: string;
}) {
  const { page = 1, limit = 20, status, search, tailorName } = params;
  const where: any = {};
  if (status && status !== 'all') where.status = status;
  if (tailorName && tailorName !== 'all') {
    where.tailorName = { contains: tailorName, mode: 'insensitive' };
  }
  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: 'insensitive' } },
      { customerPhone: { contains: search } },
      { orderNumber: { contains: search } },
    ];
  }
  const [orders, total] = await Promise.all([
    prisma.stitchingOrder.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { dueDate: 'asc' },
    }),
    prisma.stitchingOrder.count({ where }),
  ]);
  return { orders, total, page, limit };
}

export async function getStitchingOrderById(id: string) {
  return prisma.stitchingOrder.findUnique({ where: { id } });
}

export async function createStitchingOrder(data: any, createdBy?: string) {
  return prisma.stitchingOrder.create({
    data: {
      ...data,
      orderNumber: generateStitchingOrderNumber(),
      dueDate: new Date(data.dueDate),
      totalPrice: data.totalPrice,
      advancePaid: data.advancePaid ?? 0,
      createdBy: createdBy ?? null,
    },
  });
}

export async function updateStitchingOrder(id: string, data: any) {
  const updateData: any = { ...data };
  if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
  return prisma.stitchingOrder.update({ where: { id }, data: updateData });
}

export async function deleteStitchingOrder(id: string) {
  return prisma.stitchingOrder.update({ // FIXED: M9 — soft-delete
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function getStitchingStats() {
  const [total, pending, inProgress, completed, delivered] = await Promise.all([
    prisma.stitchingOrder.count(),
    prisma.stitchingOrder.count({ where: { status: 'PENDING' } }),
    prisma.stitchingOrder.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.stitchingOrder.count({ where: { status: 'COMPLETED' } }),
    prisma.stitchingOrder.count({ where: { status: 'DELIVERED' } }),
  ]);
  return { total, pending, inProgress, completed, delivered };
}

export async function getStitchingTailors(): Promise<string[]> {
  const result = await prisma.stitchingOrder.findMany({
    select: { tailorName: true },
    distinct: ['tailorName'],
    where: { tailorName: { not: null } },
  });
  return result.map((r) => r.tailorName).filter(Boolean) as string[];
}

// ── Manual Payment Submission helpers ──────────────────────────────

export async function checkDuplicateTransactionId(
  transactionId: string,
  excludeOrderId?: string
): Promise<boolean> {
  const existing = await prisma.manualPaymentSubmission.findFirst({
    where: {
      transactionId: { equals: transactionId, mode: 'insensitive' },
      orderId: excludeOrderId ? { not: excludeOrderId } : undefined,
    }
  });
  return !!existing;
}

export async function createManualPaymentSubmission(data: {
  orderId: string;
  paymentMethod: string;
  transactionId: string;
  senderName: string;
  screenshotUrl?: string;
}) {
  const isDuplicate = await checkDuplicateTransactionId(data.transactionId);
  const flagged = isDuplicate;
  const flagReason = isDuplicate ? 'Duplicate transaction ID detected' : undefined;

  const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_HOURS * 60 * 60 * 1000);

  return prisma.manualPaymentSubmission.create({
    data: {
      ...data,
      flagged,
      flagReason: flagReason ?? null,
      expiresAt,
    },
  });
}

export async function getPendingPaymentQueue(page = 1, limit = 20) {
  const where = { status: 'PENDING' as const };
  const [submissions, total] = await Promise.all([
    prisma.manualPaymentSubmission.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        order: {
          include: {
            items: {
              include: { product: { select: { name: true, stockQuantity: true } } },
            },
          },
        },
      },
      orderBy: [
        { flagged: 'desc' },
        { createdAt: 'asc' },
      ],
    }),
    prisma.manualPaymentSubmission.count({ where }),
  ]);
  return { submissions, total, page, limit };
}

export async function getAllPaymentSubmissions(params: {
  page?: number; limit?: number;
  status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  flagged?: boolean;
}) {
  const { page = 1, limit = 20, status, flagged } = params;
  const where: any = {};
  if (status) where.status = status;
  if (flagged !== undefined) where.flagged = flagged;

  const [submissions, total] = await Promise.all([
    prisma.manualPaymentSubmission.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        order: {
          select: {
            orderNumber: true, grandTotal: true, status: true,
            shippingAddress: true,
            items: { include: { product: { select: { name: true, stockQuantity: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.manualPaymentSubmission.count({ where }),
  ]);
  return { submissions, total, page, limit };
}

export async function verifyManualPayment(
  submissionId: string,
  adminId: string,
  adminEmail: string
) {
  const submission = await prisma.manualPaymentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      order: { include: { items: { include: { product: true } } } },
    },
  });
  if (!submission) throw new Error('Submission not found');
  if (submission.status !== 'PENDING') throw new Error('Already processed');

  return prisma.$transaction(async (tx) => {
    // 1. Mark submission as verified
    await tx.manualPaymentSubmission.update({
      where: { id: submissionId },
      data: { status: 'VERIFIED', verifiedBy: adminId, verifiedAt: new Date() },
    });

    // 2. Update order payment status to PAID
    await tx.order.update({
      where: { id: submission.orderId },
      data: {
        paymentStatus: 'PAID',
        status: 'PROCESSING',
      },
    });

    // 3. Deduct stock NOW (not at order creation)
    for (const item of submission.order.items) {
      const deducted = await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { decrement: item.quantity } },
        select: { stockQuantity: true },
      });
      // BUG FIX: Mark as out of stock if quantity drops to 0 or below
      if (deducted.stockQuantity <= 0) {
        await tx.product.update({
          where: { id: item.productId },
          data: { inStock: false },
        });
      }
    }

    // 4. Audit log
    await tx.auditLog.create({
      data: {
        userId: adminId,
        userEmail: adminEmail,
        action: 'PAYMENT_VERIFIED',
        entity: 'ManualPaymentSubmission',
        entityId: submissionId,
        newValue: {
          orderId: submission.orderId,
          transactionId: submission.transactionId,
          amount: Number(submission.order.grandTotal),
        },
      },
    });

    return submission;
  });
}

export async function rejectManualPayment(
  submissionId: string,
  adminId: string,
  adminEmail: string,
  reason: string
) {
  const submission = await prisma.manualPaymentSubmission.findUnique({
    where: { id: submissionId },
  });
  if (!submission) throw new Error('Submission not found');
  if (submission.status !== 'PENDING') throw new Error('Already processed');

  return prisma.$transaction(async (tx) => {
    await tx.manualPaymentSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'REJECTED',
        verifiedBy: adminId,
        verifiedAt: new Date(),
        rejectionReason: reason,
      },
    });

    await tx.order.update({
      where: { id: submission.orderId },
      data: { paymentStatus: 'FAILED', status: 'CANCELLED' },
    });

    await tx.auditLog.create({
      data: {
        userId: adminId,
        userEmail: adminEmail,
        action: 'PAYMENT_REJECTED',
        entity: 'ManualPaymentSubmission',
        entityId: submissionId,
        newValue: { reason, orderId: submission.orderId },
      },
    });

    return submission;
  });
}

export async function deleteManualPayment(
  submissionId: string,
  adminId: string,
  adminEmail: string
) {
  const submission = await prisma.manualPaymentSubmission.findUnique({
    where: { id: submissionId },
  });
  if (!submission) throw new Error('Submission not found');

  await prisma.$transaction(async (tx) => {
    await tx.manualPaymentSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'REJECTED',
        verifiedBy: adminId,
        verifiedAt: new Date(),
        rejectionReason: 'Administratively deleted',
      },
    });

    await tx.auditLog.create({
      data: {
        userId: adminId,
        userEmail: adminEmail,
        action: 'PAYMENT_DELETED',
        entity: 'ManualPaymentSubmission',
        entityId: submissionId,
        newValue: {
          orderId: submission.orderId,
          transactionId: submission.transactionId,
        },
      },
    });
  });

  return submission;
}

export async function getPaymentVerificationStats() {
  const [pending, flagged, verifiedToday, rejectedToday] = await Promise.all([
    prisma.manualPaymentSubmission.count({ where: { status: 'PENDING' } }),
    prisma.manualPaymentSubmission.count({ where: { status: 'PENDING', flagged: true } }),
    prisma.manualPaymentSubmission.count({
      where: {
        status: 'VERIFIED',
        verifiedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.manualPaymentSubmission.count({
      where: {
        status: 'REJECTED',
        verifiedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);
  return { pending, flagged, verifiedToday, rejectedToday };
}

// ── Soft-Hold Inventory ───────────────────────────────────────────

export async function getProductSoftReservedQuantity(productId: string): Promise<number> {
  const pendingOrders = await prisma.order.findMany({
    where: {
      paymentStatus: 'PENDING_VERIFICATION',
      status: 'PENDING',
    },
    select: {
      items: {
        where: { productId },
        select: { quantity: true },
      },
    },
  });

  return pendingOrders.reduce((total, order) => {
    return total + order.items.reduce((sum, item) => sum + item.quantity, 0);
  }, 0);
}

export async function getProductAvailableStock(productId: string): Promise<number> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { stockQuantity: true },
  });
  if (!product) return 0;

  const softReserved = await getProductSoftReservedQuantity(productId);
  return Math.max(0, product.stockQuantity - softReserved);
}

// ── Auto-Expiry ──────────────────────────────────────────────────

const PAYMENT_EXPIRY_HOURS = 12;

export async function autoExpirePendingPayments() {
  const now = new Date();
  const expiredSubmissions = await prisma.manualPaymentSubmission.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lte: now },
    },
    include: { order: true },
  });

  if (expiredSubmissions.length === 0) return { expired: 0 };

  await prisma.$transaction(async (tx) => {
    for (const sub of expiredSubmissions) {
      await tx.manualPaymentSubmission.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });

      await tx.order.update({
        where: { id: sub.orderId },
        data: { status: 'CANCELLED', paymentStatus: 'FAILED' },
      });

      await tx.auditLog.create({
        data: {
          action: 'ORDER_STATUS_CHANGED',
          entity: 'ManualPaymentSubmission',
          entityId: sub.id,
          newValue: {
            status: 'EXPIRED',
            orderId: sub.orderId,
            reason: 'Payment verification window expired',
          },
        },
      });
    }
  });

  return { expired: expiredSubmissions.length };
}
