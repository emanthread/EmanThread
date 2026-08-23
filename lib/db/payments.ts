import { prisma } from "@/lib/db";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { syncProductsAfterVariantStockChange } from "@/lib/db/product-inventory";
import type { Prisma } from "@prisma/client";

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
  return prisma.$transaction(async (tx) => {
    const normalizedTransactionId = data.transactionId.trim().toLocaleLowerCase('en-US');
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`manual-payment:${normalizedTransactionId}`}))`;
    const duplicate = await tx.manualPaymentSubmission.findFirst({
      where: {
        transactionId: { equals: data.transactionId.trim(), mode: 'insensitive' },
      },
      select: { id: true },
    });
    const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_HOURS * 60 * 60 * 1000);

    return tx.manualPaymentSubmission.create({
      data: {
        ...data,
        transactionId: data.transactionId.trim(),
        senderName: data.senderName.trim(),
        flagged: Boolean(duplicate),
        flagReason: duplicate ? 'Duplicate transaction ID detected' : null,
        expiresAt,
      },
    });
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
  status?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  flagged?: boolean;
  search?: string;
}) {
  const { page = 1, limit = 20, status, flagged, search } = params;
  const where: Prisma.ManualPaymentSubmissionWhereInput = {};
  if (status) where.status = status;
  if (flagged !== undefined) where.flagged = flagged;
  if (search) {
    where.OR = [
      { transactionId: { contains: search, mode: 'insensitive' } },
      { senderName: { contains: search, mode: 'insensitive' } },
      { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
    ];
  }

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
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.manualPaymentSubmission.updateMany({
      where: { id: submissionId, status: 'PENDING' },
      data: { status: 'VERIFIED', verifiedBy: adminId, verifiedAt: new Date() },
    });

    if (claimed.count === 0) {
      const existing = await tx.manualPaymentSubmission.findUnique({
        where: { id: submissionId },
        select: { id: true, status: true },
      });
      if (!existing) throw new Error('Submission not found');
      throw new Error('Already processed');
    }

    const submission = await tx.manualPaymentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: { select: { name: true, images: true, sku: true } },
              },
            },
          },
        },
      },
    });
    if (!submission) throw new Error('Submission not found');

    // Only query option snapshots after the additive commerce migration has
    // explicitly been enabled. Old manual-payment orders stay byte-for-byte on
    // the Product stock path below.
    const variantByOrderItemId = new Map<string, string>();
    if (FEATURE_FLAGS.COMMERCE_PROFILE_V1 && submission.order.items.length > 0) {
      const configurations = await tx.orderItemConfiguration.findMany({
        where: { orderItemId: { in: submission.order.items.map((item) => item.id) } },
        select: { orderItemId: true, productVariantId: true },
      });
      for (const configuration of configurations) {
        if (configuration.productVariantId) {
          variantByOrderItemId.set(configuration.orderItemId, configuration.productVariantId);
        }
      }
    }

    const orderUpdate = await tx.order.updateMany({
      where: {
        id: submission.orderId,
        paymentStatus: { not: 'PAID' },
        status: { not: 'CANCELLED' },
      },
      data: {
        paymentStatus: 'PAID',
        status: 'PROCESSING',
      },
    });
    if (orderUpdate.count === 0) {
      throw new Error('Order is already paid or cancelled');
    }

    const changedVariantProductIds = new Set<string>();
    for (const item of submission.order.items) {
      const variantId = variantByOrderItemId.get(item.id);
      if (variantId) {
        const deducted = await tx.productVariant.updateMany({
          where: {
            id: variantId,
            stockQuantity: { gte: item.quantity },
          },
          data: { stockQuantity: { decrement: item.quantity } },
        });
        if (deducted.count === 0) {
          throw new Error(`Insufficient stock for selected option ${variantId}`);
        }
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          select: { stockQuantity: true },
        });
        if (variant && variant.stockQuantity <= 0) {
          await tx.productVariant.update({
            where: { id: variantId },
            data: { inStock: false },
          });
        }
        changedVariantProductIds.add(item.productId);
        continue;
      }

      const deducted = await tx.product.updateMany({
        where: {
          id: item.productId,
          stockQuantity: { gte: item.quantity },
        },
        data: { stockQuantity: { decrement: item.quantity } },
      });
      if (deducted.count === 0) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
      }
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stockQuantity: true },
      });
      if (product && product.stockQuantity <= 0) {
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
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.manualPaymentSubmission.updateMany({
      where: { id: submissionId, status: 'PENDING' },
      data: {
        status: 'REJECTED',
        verifiedBy: adminId,
        verifiedAt: new Date(),
        rejectionReason: reason,
      },
    });
    if (claimed.count === 0) {
      const existing = await tx.manualPaymentSubmission.findUnique({
        where: { id: submissionId },
        select: { id: true },
      });
      if (!existing) throw new Error('Submission not found');
      throw new Error('Already processed');
    }

    const submission = await tx.manualPaymentSubmission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) throw new Error('Submission not found');

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
  return prisma.$transaction(async (tx) => {
    const submission = await tx.manualPaymentSubmission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) throw new Error('Submission not found');
    if (submission.status !== 'PENDING') {
      throw new Error('Processed payment records cannot be deleted');
    }

    await tx.manualPaymentSubmission.update({
      where: { id: submission.id },
      data: {
        status: 'REJECTED',
        verifiedBy: adminId,
        verifiedAt: new Date(),
        rejectionReason: 'Administratively deleted',
      },
    });

    const cancelledOrder = await tx.order.updateMany({
      where: {
        id: submission.orderId,
        paymentStatus: 'PENDING_VERIFICATION',
      },
      data: { paymentStatus: 'FAILED', status: 'CANCELLED' },
    });
    if (cancelledOrder.count === 0) {
      throw new Error('Payment order is already processed or cannot be cancelled');
    }

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
    return submission;
  });
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

export const PAYMENT_EXPIRY_HOURS = 12;

export async function autoExpirePendingPayments() {
  const now = new Date();
  const expiredSubmissions = await prisma.manualPaymentSubmission.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lte: now },
    },
    select: { id: true, orderId: true },
    orderBy: { expiresAt: 'asc' },
    take: 200,
  });

  if (expiredSubmissions.length === 0) return { expired: 0 };

  const expired = await prisma.$transaction(async (tx) => {
    let claimedCount = 0;
    for (const sub of expiredSubmissions) {
      const claimed = await tx.manualPaymentSubmission.updateMany({
        where: { id: sub.id, status: 'PENDING', expiresAt: { lte: now } },
        data: { status: 'EXPIRED' },
      });
      if (claimed.count === 0) continue;
      claimedCount += 1;

      await tx.order.updateMany({
        where: {
          id: sub.orderId,
          status: 'PENDING',
          paymentStatus: 'PENDING_VERIFICATION',
        },
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
    return claimedCount;
  });

  return { expired };
}
