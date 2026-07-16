import { prisma } from "@/lib/db";
import { parseProductImages } from "@/lib/utils/parse-images";

// ── Return Request Interfaces ──────────────────────────────────────

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

// ── Internal transformers ──────────────────────────────────────────

function transformReturnRequest(req: any) {
  return {
    id: req.id,
    orderId: req.orderId,
    orderNumber: req.order?.orderNumber || "",
    customerId: req.user?.id || "guest",
    customerName: req.user?.name || "Guest",
    customerEmail: req.user?.email || "",
    customerPhone: req.user?.phone || "",
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
        productImage: parseProductImages(item.product.images)[0] || "/placeholder.jpg",
        quantity: item.quantity,
        price: Number(item.priceAtTimeOfPurchase),
        sku: item.product.sku,
      })) || [],
  };
}

// ── Query functions ─────────────────────────────────────────────────

export async function createReturnRequest(data: CreateReturnRequestInput) {
  const returnRequest = await prisma.$transaction(async (tx) => {
    // Verify order exists and is delivered
    const order = await tx.order.findUnique({
      where: { id: data.orderId },
      include: { items: { include: { product: { select: { name: true, images: true, sku: true } } } } },
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
      { user: { phone: { contains: search, mode: "insensitive" } } },
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
      order: { include: { items: { include: { product: { select: { name: true, images: true, sku: true } } } } } },
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
