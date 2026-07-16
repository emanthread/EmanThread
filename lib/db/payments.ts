import { prisma } from "@/lib/db";

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
      order: { include: { items: { include: { product: { select: { name: true, images: true, sku: true } } } } } },
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

export const PAYMENT_EXPIRY_HOURS = 12;

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
