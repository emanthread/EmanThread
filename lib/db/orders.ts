import { prisma } from "@/lib/db";
import { parseProductImages } from "@/lib/utils/parse-images";
import type { Prisma, OrderStatus, PaymentMethod } from "@prisma/client";

// ── Interfaces ──────────────────────────────────────────────────

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
  stitchingDeliveryDate?: Date;
}

/** Runtime shape of the shippingAddress JSON column. */
interface ShippingAddressJson {
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  email?: string;
  phone?: string;
}

// ── Private helpers ─────────────────────────────────────────────

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `ET-${year}-${random}`;
}

// ── Order CRUD ─────────────────────────────────────────────────

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
        paymentMethod: data.paymentMethod as PaymentMethod,
        paymentStatus: skipStockDeduction ? "PENDING_VERIFICATION" : "PENDING",
        subtotal: data.subtotal,
        shippingCost: data.shippingCost,
        discountAmount: data.discountAmount ?? null,
        couponCode: appliedCouponCode,
        grandTotal: data.grandTotal,
        notes: data.notes || null,
        shippingAddress: data.shippingAddress as unknown as Prisma.InputJsonValue,
        stitchingFee: data.stitchingFee ?? 0,
        stitchingDeliveryDate: data.stitchingDeliveryDate ?? null,
        stitchingSnapshots: data.stitchingItems ? JSON.parse(JSON.stringify(data.stitchingItems)) : null,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            priceAtTimeOfPurchase: item.price,
          })),
        },
      },
      include: { items: { include: { product: { select: { name: true, images: true, sku: true } } } } },
    });

    // Deduct stock for each product (skip when awaiting manual payment verification)
    // Also marks product as out of stock if stock reaches 0
    if (!skipStockDeduction) {
      for (const item of data.items) {
        const deducted = await tx.product.updateMany({
          where: {
            id: item.productId,
            stockQuantity: { gte: item.quantity }, // Atomic guard: only deduct if enough stock
          },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
        });
        // If updateMany returned 0, stock was insufficient (TOCTOU guard)
        if (deducted.count === 0) {
          throw new Error(`Insufficient stock for product ${item.productId}`);
        }
        // Check if stock reached 0 and mark out of stock
        const updated = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stockQuantity: true },
        });
        if (updated && updated.stockQuantity <= 0) {
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
    stitchingDeliveryDate: order.stitchingDeliveryDate?.toISOString() ?? null,
  };
}

export async function getOrdersByUser(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          product: { select: { name: true, images: true, sku: true } },
        },
      },
      itemMeasurements: true,
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
    notes: order.notes || null,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.product?.name || "Unknown Product",
      image: item.product?.images
        ? parseProductImages(item.product.images)[0] || "/placeholder.jpg"
        : "/placeholder.jpg",
      quantity: item.quantity,
      price: Number(item.priceAtTimeOfPurchase),
    })),
    measurements: (order.itemMeasurements || []).map((m) => ({
      id: m.id,
      productId: m.productId,
      productName: m.productName,
      snapshot: m.measurementSnapshot as any,
    })),
  }));
}

export async function getOrderById(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: { select: { name: true, images: true, sku: true } },
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
    notes: order.notes || null,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.product?.name || "Unknown Product",
      image: item.product?.images
        ? parseProductImages(item.product.images)[0] || "/placeholder.jpg"
        : "/placeholder.jpg",
      quantity: item.quantity,
      price: Number(item.priceAtTimeOfPurchase),
    })),
  };
}

// ── Admin helpers ───────────────────────────────────────────────

export async function getAdminOrders(options: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { status, search, page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {};
  if (status && status !== "all") {
    where.status = status.toUpperCase() as OrderStatus;
  }
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { user: { phone: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        subtotal: true,
        shippingCost: true,
        stitchingFee: true,
        discountAmount: true,
        grandTotal: true,
        notes: true,
        shippingAddress: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: {
          select: {
            productId: true,
            quantity: true,
            priceAtTimeOfPurchase: true,
            product: { select: { name: true, images: true, sku: true } },
          },
        },
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
      customerEmail: order.user?.email || (order.shippingAddress
        ? (order.shippingAddress as ShippingAddressJson).email || ""
        : ""),
      customerPhone: order.user?.phone || (order.shippingAddress
        ? (order.shippingAddress as ShippingAddressJson).phone || ""
        : ""),
      shippingAddress: order.shippingAddress
        ? {
            address: (order.shippingAddress as ShippingAddressJson).address || "",
            city: (order.shippingAddress as ShippingAddressJson).city || "",
            province: (order.shippingAddress as ShippingAddressJson).province || "",
            postalCode: (order.shippingAddress as ShippingAddressJson).postalCode || "",
          }
        : { address: "", city: "", province: "", postalCode: "" },
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.product?.name || "Unknown Product",
        productImage: item.product?.images
          ? parseProductImages(item.product.images)[0] || "/placeholder.jpg"
          : "/placeholder.jpg",
        quantity: item.quantity,
        price: Number(item.priceAtTimeOfPurchase),
        sku: item.product?.sku || "N/A",
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
    totalPages: Math.ceil(total / limit),
  };
}

export async function updateOrderStatus(id: string, status: string) {
  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id },
      data: { status: status as OrderStatus },
      include: { items: { include: { product: { select: { name: true, images: true, sku: true } } } }, user: true },
    });

    // Restore stock when cancelling an order
    if (status === "CANCELLED") {
      for (const item of updated.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { increment: item.quantity },
            inStock: true,
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
          address: (order.shippingAddress as ShippingAddressJson).address || "",
          city: (order.shippingAddress as ShippingAddressJson).city || "",
          province: (order.shippingAddress as ShippingAddressJson).province || "",
          postalCode: (order.shippingAddress as ShippingAddressJson).postalCode || "",
        }
      : { address: "", city: "", province: "", postalCode: "" },
    items: order.items.map((item) => ({
      productId: item.productId,
      productName: item.product?.name || "Unknown Product",
      productImage: item.product?.images
        ? parseProductImages(item.product.images)[0] || "/placeholder.jpg"
        : "/placeholder.jpg",
      quantity: item.quantity,
      price: Number(item.priceAtTimeOfPurchase),
      sku: item.product?.sku || "N/A",
    })),
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shippingCost),
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
  };
}
