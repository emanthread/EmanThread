import { prisma } from "@/lib/db";
import { parseProductImages } from "@/lib/utils/parse-images";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { syncProductsAfterVariantStockChange } from "@/lib/db/product-inventory";
import { ARCHIVED_PRODUCT_TAG } from "@/lib/product-archive";
import { hasOnlyUnstitchedCatalogPaths } from "@/lib/commerce";
import type { Prisma, OrderStatus, PaymentMethod } from "@prisma/client";
import { randomUUID } from "node:crypto";

// ── Interfaces ──────────────────────────────────────────────────

export interface OrderItemInput {
  productId: string;
  quantity: number;
  price: number;
  /** Optional additive product-option ID. Legacy fabric orders omit this. */
  variantId?: string;
  selectedOptions?: Array<{ label: string; value: string }>;
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
  stitchingItems?: Array<{
    productId: string;
    fabricType: string;
    priceKey: string;
    stitchingPrice: number;
    adminMeasurement?: Record<string, unknown>;
    stitchingVariantName?: string;
  }>;
  stitchingDeliveryDate?: Date;
  stitchingDailyThreshold?: number;
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
  const token = randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
  return `ET-${year}-${token}`;
}

type ResolvedVariant = {
  id: string;
  sku: string | null;
  label: string;
  selectedOptions: Array<{ label: string; value: string }>;
  variantImage: string | null;
};

type OrderItemOptionSnapshot = {
  productVariantId: string | null;
  variantSku: string | null;
  variantLabel: string | null;
  variantImage: string | null;
  selectedOptions: unknown;
};

/**
 * Read option history only after the additive table exists. Keeping this in a
 * small guarded helper makes all existing order history routes safe to deploy
 * before the migration is applied.
 */
async function getOptionSnapshotsByOrderItemId(orderItemIds: string[]) {
  const snapshots = new Map<string, OrderItemOptionSnapshot>();
  if (!FEATURE_FLAGS.COMMERCE_PROFILE_V1 || orderItemIds.length === 0) {
    return snapshots;
  }

  const configurations = await prisma.orderItemConfiguration.findMany({
    where: { orderItemId: { in: orderItemIds } },
    select: {
      orderItemId: true,
      productVariantId: true,
      variantSku: true,
      variantLabel: true,
      variantImage: true,
      selectedOptions: true,
    },
  });
  for (const configuration of configurations) {
    snapshots.set(configuration.orderItemId, configuration);
  }
  return snapshots;
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
      } else {
        if (discount.usageLimit === null) {
          await tx.discount.update({
            where: { id: discount.id },
            data: { usageCount: { increment: 1 } },
          });
        } else {
          const claimed = await tx.discount.updateMany({
            where: {
              id: discount.id,
              usageCount: { lt: discount.usageLimit },
            },
            data: { usageCount: { increment: 1 } },
          });
          if (claimed.count === 0) {
            throw new Error("Discount usage limit reached");
          }
        }
      }
    }

    // Resolve and validate each line inside the same transaction that creates
    // the order. Products without a variant follow the exact legacy stock path.
    const resolvedVariants: Array<ResolvedVariant | null> = [];
    const variantQuantityById = new Map<string, number>();
    const commerceProfileByProductId = new Map<string, {
      requiresSelection: boolean;
      productKind: string;
      stitchingEligible: boolean;
    }>();
    const inferredUnstitchedProductIds = new Set<string>();

    if (FEATURE_FLAGS.CATALOG_ADMIN_ASSIGNMENTS_V1) {
      const assignments = await tx.productCatalogAssignment.findMany({
        where: { productId: { in: data.items.map((item) => item.productId) } },
        select: { productId: true, catalogNode: { select: { path: true } } },
      });
      const pathsByProductId = new Map<string, string[]>();
      for (const assignment of assignments) {
        const paths = pathsByProductId.get(assignment.productId) ?? [];
        paths.push(assignment.catalogNode.path);
        pathsByProductId.set(assignment.productId, paths);
      }
      for (const [productId, paths] of pathsByProductId) {
        if (hasOnlyUnstitchedCatalogPaths(paths)) {
          inferredUnstitchedProductIds.add(productId);
        }
      }
    }

    // This is intentionally gated before it references the additive table.
    // A profile's required option is a server-side rule, not just a UI hint.
    if (FEATURE_FLAGS.COMMERCE_PROFILE_V1) {
      const profiles = await tx.productCommerceProfile.findMany({
        where: { productId: { in: data.items.map((item) => item.productId) } },
        select: {
          productId: true,
          requiresSelection: true,
          productKind: true,
          stitchingEligible: true,
        },
      });
      for (const profile of profiles) {
        commerceProfileByProductId.set(profile.productId, profile);
      }
    }

    for (const [index, item] of data.items.entries()) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: {
          stockQuantity: true,
          name: true,
          price: true,
          inStock: true,
          tags: true,
          images: true,
        },
      });
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      if (product.tags.includes(ARCHIVED_PRODUCT_TAG)) {
        throw new Error(`Product is no longer available: ${product.name}`);
      }

      if (item.variantId) {
        if (!FEATURE_FLAGS.COMMERCE_PROFILE_V1) {
          throw new Error("Product options are not available yet");
        }

        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: {
            id: true,
            sku: true,
            label: true,
            priceAdjustment: true,
            stockQuantity: true,
            inStock: true,
            isActive: true,
            images: true,
            commerceProfile: {
              select: {
                productId: true,
                optionLabel: true,
                options: { where: { isRequired: true }, select: { id: true } },
              },
            },
            selections: {
              include: {
                option: { select: { label: true, type: true, displayOrder: true } },
                optionValue: { select: { label: true, images: true } },
              },
            },
          },
        });

        if (!variant || variant.commerceProfile.productId !== item.productId) {
          throw new Error(`Selected option is not available for ${product.name}`);
        }
        if (
          variant.commerceProfile.options.length > 0 &&
          variant.selections.length !== variant.commerceProfile.options.length
        ) {
          throw new Error(`Selected combination is incomplete for ${product.name}`);
        }
        if (!variant.isActive || !variant.inStock) {
          throw new Error(`Selected option is out of stock for ${product.name}`);
        }

        const expectedPrice = Number(product.price) + Number(variant.priceAdjustment);
        if (Math.abs(expectedPrice - item.price) > 0.01) {
          throw new Error(`Price mismatch for product ${product.name}`);
        }

        const totalVariantQuantity = (variantQuantityById.get(variant.id) ?? 0) + item.quantity;
        if (variant.stockQuantity < totalVariantQuantity) {
          throw new Error(`Insufficient stock for selected option of ${product.name}. Available: ${variant.stockQuantity}`);
        }
        variantQuantityById.set(variant.id, totalVariantQuantity);
        const visualSelection = variant.selections.find((selection) =>
          selection.option.type === "COLOR" || selection.option.type === "SHADE"
        );
        resolvedVariants[index] = {
          id: variant.id,
          sku: variant.sku,
          label: variant.label,
          selectedOptions: variant.selections.length > 0
            ? [...variant.selections]
                .sort((left, right) => left.option.displayOrder - right.option.displayOrder)
                .map((selection) => ({
                  label: selection.option.label,
                  value: selection.optionValue.label,
                }))
            : [{
                label: variant.commerceProfile.optionLabel?.trim() || "Option",
                value: variant.label,
              }],
          variantImage:
            (variant.images ? parseProductImages(variant.images)[0] : undefined) ||
            (visualSelection?.optionValue.images
              ? parseProductImages(visualSelection.optionValue.images)[0]
              : undefined) ||
            parseProductImages(product.images)[0] ||
            null,
        };
        continue;
      }

      const itemCommerceProfile = commerceProfileByProductId.get(item.productId);
      const isRepairedStaleUnstitchedProfile =
        inferredUnstitchedProductIds.has(item.productId) &&
        itemCommerceProfile?.productKind !== "UNSTITCHED_FABRIC";
      if (
        itemCommerceProfile?.requiresSelection &&
        !isRepairedStaleUnstitchedProfile
      ) {
        throw new Error(`Please choose an option for ${product.name}`);
      }

      if (!product.inStock) {
        throw new Error(`Product is out of stock: ${product.name}`);
      }

      if (product.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stockQuantity}`);
      }
      resolvedVariants[index] = null;
    }

    // New profiles can explicitly disable tailoring. This lookup is entirely
    // behind the flag so pre-migration production never touches new tables.
    if (FEATURE_FLAGS.COMMERCE_PROFILE_V1 && data.stitchingItems?.length) {
      const disallowedIds = new Set<string>();
      for (const [productId, profile] of commerceProfileByProductId) {
        const disallowed = profile.productKind === "UNSTITCHED_FABRIC"
          ? !profile.stitchingEligible
          : !inferredUnstitchedProductIds.has(productId);
        if (disallowed) disallowedIds.add(productId);
      }
      if (data.stitchingItems.some((item) => disallowedIds.has(item.productId))) {
        throw new Error("Stitching is not available for one or more selected products");
      }
    }

    // Serialize bookings for the chosen PKT delivery day. Availability is
    // previewed before checkout, but this in-transaction guard is the final
    // authority and prevents simultaneous orders from overbooking one day.
    if (
      data.stitchingFee &&
      data.stitchingFee > 0 &&
      data.stitchingDeliveryDate
    ) {
      const deliveryDate = data.stitchingDeliveryDate;
      const nextDay = new Date(deliveryDate.getTime() + 24 * 60 * 60 * 1000);
      const lockKey = `stitching-capacity:${deliveryDate.toISOString()}`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      const rules = await tx.stitchingCalendarRule.findMany({
        where: {
          isActive: true,
          OR: [
            {
              type: { in: ["BLOCKED_DATE", "CAPACITY_OVERRIDE"] },
              date: { gte: deliveryDate, lt: nextDay },
            },
            {
              type: { in: ["BLOCKED_RANGE", "CAPACITY_RANGE"] },
              startDate: { lt: nextDay },
              endDate: { gte: deliveryDate },
            },
          ],
        },
        select: { type: true, capacity: true },
      });
      const blocked = rules.some(
        (rule) => rule.type === "BLOCKED_DATE" || rule.type === "BLOCKED_RANGE"
      );
      const overrides = rules.flatMap((rule) =>
        rule.capacity === null ? [] : [rule.capacity]
      );
      const capacity = blocked
        ? null
        : overrides.length > 0
          ? Math.min(...overrides)
          : data.stitchingDailyThreshold ?? 12;
      const booked = await tx.order.count({
        where: {
          stitchingDeliveryDate: { gte: deliveryDate, lt: nextDay },
          stitchingFee: { gt: 0 },
          status: { not: "CANCELLED" },
        },
      });
      if (capacity === null || booked >= capacity) {
        throw new Error(
          "Selected stitching delivery date is no longer available. Please try again."
        );
      }
    }

    // Pending manual payments are soft reservations. Lock every inventory
    // identity in a stable order, then re-check real stock minus existing
    // reservations so manual and immediate-payment checkouts cannot oversell
    // one another under concurrency.
    const inventoryRequests = new Map<
      string,
      { kind: "product" | "variant"; id: string; quantity: number; label: string }
    >();
    for (const [index, item] of data.items.entries()) {
      const variant = resolvedVariants[index];
      const kind = variant ? "variant" : "product";
      const id = variant?.id || item.productId;
      const key = `${kind}:${id}`;
      const previous = inventoryRequests.get(key);
      inventoryRequests.set(key, {
        kind,
        id,
        quantity: (previous?.quantity || 0) + item.quantity,
        label: variant?.label || item.productId,
      });
    }
    const sortedInventoryRequests = [...inventoryRequests.entries()].sort(
      ([left], [right]) => left.localeCompare(right)
    );
    for (const [key] of sortedInventoryRequests) {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`inventory:${key}`}))`;
    }
    for (const [, request] of sortedInventoryRequests) {
      const stockQuantity = request.kind === "variant"
        ? (await tx.productVariant.findUnique({
            where: { id: request.id },
            select: { stockQuantity: true },
          }))?.stockQuantity
        : (await tx.product.findUnique({
            where: { id: request.id },
            select: { stockQuantity: true },
          }))?.stockQuantity;
      if (stockQuantity === undefined) {
        throw new Error(`Inventory not found for ${request.label}`);
      }

      const reserved = request.kind === "variant"
        ? FEATURE_FLAGS.COMMERCE_PROFILE_V1
          ? await tx.orderItem.aggregate({
              where: {
                configuration: { is: { productVariantId: request.id } },
                order: {
                  paymentStatus: "PENDING_VERIFICATION",
                  status: "PENDING",
                },
              },
              _sum: { quantity: true },
            })
          : null
        : await tx.orderItem.aggregate({
            where: {
              productId: request.id,
              ...(FEATURE_FLAGS.COMMERCE_PROFILE_V1
                ? { configuration: { is: null } }
                : {}),
              order: {
                paymentStatus: "PENDING_VERIFICATION",
                status: "PENDING",
              },
            },
            _sum: { quantity: true },
          });
      const reservedQuantity = reserved?._sum.quantity || 0;
      const availableQuantity = Math.max(0, stockQuantity - reservedQuantity);
      if (request.quantity > availableQuantity) {
        throw new Error(
          `Insufficient stock for ${request.label}. Available: ${availableQuantity}`
        );
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
      },
    });

    // Create each line explicitly so its immutable option snapshot is tied to
    // the exact OrderItem even when a product appears in more than one line.
    const createdItems = await Promise.all(
      data.items.map((item) =>
        tx.orderItem.create({
          data: {
            orderId: created.id,
            productId: item.productId,
            quantity: item.quantity,
            priceAtTimeOfPurchase: item.price,
          },
        }),
      ),
    );

    if (FEATURE_FLAGS.COMMERCE_PROFILE_V1) {
      await Promise.all(
        createdItems.flatMap((orderItem, index) => {
          const variant = resolvedVariants[index];
          if (!variant) return [];
          // The server, not browser storage, determines the option snapshot.
          const selectedOptions = variant.selectedOptions;
          return tx.orderItemConfiguration.create({
            data: {
              orderItemId: orderItem.id,
              productVariantId: variant.id,
              variantSku: variant.sku,
              variantLabel: variant.label,
              variantImage: variant.variantImage,
              selectedOptions: JSON.parse(JSON.stringify(selectedOptions)) as Prisma.InputJsonValue,
            },
          });
        }),
      );
    }

    // Deduct stock for each product (skip when awaiting manual payment verification)
    // Also marks product as out of stock if stock reaches 0
    if (!skipStockDeduction) {
      const changedVariantProductIds = new Set<string>();
      for (const [index, item] of data.items.entries()) {
        const variant = resolvedVariants[index];
        if (variant) {
          const deducted = await tx.productVariant.updateMany({
            where: {
              id: variant.id,
              isActive: true,
              inStock: true,
              stockQuantity: { gte: item.quantity },
            },
            data: { stockQuantity: { decrement: item.quantity } },
          });
          if (deducted.count === 0) {
            throw new Error(`Insufficient stock for selected option ${variant.label}`);
          }
          const updatedVariant = await tx.productVariant.findUnique({
            where: { id: variant.id },
            select: { stockQuantity: true },
          });
          if (updatedVariant && updatedVariant.stockQuantity <= 0) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { inStock: false },
            });
          }
          changedVariantProductIds.add(item.productId);
          continue;
        }

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
      await syncProductsAfterVariantStockChange(
        tx,
        changedVariantProductIds
      );
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
  const optionSnapshots = await getOptionSnapshotsByOrderItemId(
    orders.flatMap((order) => order.items.map((item) => item.id)),
  );

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
    items: order.items.map((item) => {
      const optionSnapshot = optionSnapshots.get(item.id);
      return {
        id: item.id,
        name: item.product?.name || "Unknown Product",
        image: optionSnapshot?.variantImage || (item.product?.images
          ? parseProductImages(item.product.images)[0] || "/placeholder.jpg"
          : "/placeholder.jpg"),
        quantity: item.quantity,
        price: Number(item.priceAtTimeOfPurchase),
        ...(optionSnapshot?.variantLabel ? { variantLabel: optionSnapshot.variantLabel } : {}),
        ...(optionSnapshot?.variantSku ? { variantSku: optionSnapshot.variantSku } : {}),
        ...(optionSnapshot?.selectedOptions ? { selectedOptions: optionSnapshot.selectedOptions } : {}),
      };
    }),
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
  const optionSnapshots = await getOptionSnapshotsByOrderItemId(order.items.map((item) => item.id));

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
    items: order.items.map((item) => {
      const optionSnapshot = optionSnapshots.get(item.id);
      return {
        id: item.id,
        name: item.product?.name || "Unknown Product",
        image: optionSnapshot?.variantImage || (item.product?.images
          ? parseProductImages(item.product.images)[0] || "/placeholder.jpg"
          : "/placeholder.jpg"),
        quantity: item.quantity,
        price: Number(item.priceAtTimeOfPurchase),
        ...(optionSnapshot?.variantLabel ? { variantLabel: optionSnapshot.variantLabel } : {}),
        ...(optionSnapshot?.variantSku ? { variantSku: optionSnapshot.variantSku } : {}),
        ...(optionSnapshot?.selectedOptions ? { selectedOptions: optionSnapshot.selectedOptions } : {}),
      };
    }),
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

  const baseWhere: Prisma.OrderWhereInput = {};
  if (search) {
    baseWhere.OR = [
      { id: { equals: search } },
      { orderNumber: { contains: search, mode: "insensitive" } },
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { user: { phone: { contains: search, mode: "insensitive" } } },
    ];
  }
  const where: Prisma.OrderWhereInput = { ...baseWhere };
  if (status && status !== "all") {
    where.status = status.toUpperCase() as OrderStatus;
  }

  const [orders, total, groupedStatusCounts] = await Promise.all([
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
            id: true,
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
    prisma.order.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { _all: true },
    }),
  ]);
  const optionSnapshots = await getOptionSnapshotsByOrderItemId(
    orders.flatMap((order) => order.items.map((item) => item.id)),
  );

  const statusCounts = {
    all: groupedStatusCounts.reduce((sum, group) => sum + group._count._all, 0),
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };
  for (const group of groupedStatusCounts) {
    const key = group.status.toLocaleLowerCase("en-US") as Exclude<keyof typeof statusCounts, "all">;
    statusCounts[key] = group._count._all;
  }

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
      items: order.items.map((item) => {
        const optionSnapshot = optionSnapshots.get(item.id);
        return {
          productId: item.productId,
          productName: item.product?.name || "Unknown Product",
          productImage: optionSnapshot?.variantImage || (item.product?.images
            ? parseProductImages(item.product.images)[0] || "/placeholder.jpg"
            : "/placeholder.jpg"),
          quantity: item.quantity,
          price: Number(item.priceAtTimeOfPurchase),
          sku: optionSnapshot?.variantSku || item.product?.sku || "N/A",
          ...(optionSnapshot?.variantLabel ? { variantLabel: optionSnapshot.variantLabel } : {}),
          ...(optionSnapshot?.selectedOptions ? { selectedOptions: optionSnapshot.selectedOptions } : {}),
        };
      }),
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
        | "cancelled",
      paymentStatus: order.paymentStatus.toLowerCase() as
        | "pending"
        | "pending_verification"
        | "paid"
        | "refunded"
        | "failed",
      paymentMethod: order.paymentMethod.toLowerCase() as
        | "cod"
        | "jazzcash"
        | "easypaisa"
        | "card"
        | "safepay"
        | "nayapay"
        | "meezan_bank",
      notes: order.notes || undefined,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    statusCounts,
  };
}

export async function updateOrderStatus(
  id: string,
  status: string,
  expectedStatus?: OrderStatus
) {
  const order = await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: {
        id,
        status: expectedStatus || { not: status as OrderStatus },
      },
      data: { status: status as OrderStatus },
    });

    if (claimed.count === 0) {
      const existing = await tx.order.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!existing) throw new Error("Order not found");
      throw new Error(
        existing.status === status
          ? `Order is already ${status.toLocaleLowerCase("en-US")}`
          : "Order status changed elsewhere. Refresh and try again."
      );
    }

    const updated = await tx.order.findUnique({
      where: { id },
      include: { items: { include: { product: { select: { name: true, images: true, sku: true } } } }, user: true },
    });

    if (!updated) throw new Error("Order not found");

    // Manual bank-transfer orders do not deduct stock until payment is verified.
    // Cancelling them before verification must not add inventory that was never removed.
    const shouldRestoreStock =
      status === "CANCELLED" && updated.paymentStatus !== "PENDING_VERIFICATION";

    if (shouldRestoreStock) {
      const variantByOrderItemId = new Map<string, string>();
      const changedVariantProductIds = new Set<string>();
      if (FEATURE_FLAGS.COMMERCE_PROFILE_V1 && updated.items.length > 0) {
        const configurations = await tx.orderItemConfiguration.findMany({
          where: { orderItemId: { in: updated.items.map((item) => item.id) } },
          select: { orderItemId: true, productVariantId: true },
        });
        for (const configuration of configurations) {
          if (configuration.productVariantId) {
            variantByOrderItemId.set(configuration.orderItemId, configuration.productVariantId);
          }
        }
      }

      for (const item of updated.items) {
        const variantId = variantByOrderItemId.get(item.id);
        if (variantId) {
          // Historical configurations intentionally have no FK, so a retired
          // variant simply cannot be restocked rather than breaking cancel.
          await tx.productVariant.updateMany({
            where: { id: variantId },
            data: {
              stockQuantity: { increment: item.quantity },
              inStock: true,
            },
          });
          changedVariantProductIds.add(item.productId);
          continue;
        }

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { increment: item.quantity },
            inStock: true,
          },
        });
      }
      await syncProductsAfterVariantStockChange(
        tx,
        changedVariantProductIds
      );
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
      | "cancelled",
    paymentStatus: order.paymentStatus.toLowerCase() as
      | "pending"
      | "pending_verification"
      | "paid"
      | "refunded"
      | "failed",
    paymentMethod: order.paymentMethod.toLowerCase() as
      | "cod"
      | "jazzcash"
      | "easypaisa"
      | "card"
      | "safepay"
      | "nayapay"
      | "meezan_bank",
    notes: order.notes || undefined,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
