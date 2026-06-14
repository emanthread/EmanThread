import { prisma } from "@/lib/db";
import { Prisma, MeasurementProfileStatus, MeasurementSource } from "@prisma/client";

// ── Centralized filters ──────────────────────────────────────────────

export function adminProfileFilter() {
  return { 
    deletedAt: null, 
    source: "order" as const,
    status: MeasurementProfileStatus.pending
  };
}

/**
 * Centralized filter: admin measurement profiles (order-linked only)
 * Saved user profiles (source: "profile") are intentionally excluded — they live
 * in the Profiles tab regardless of status.
 */
export function adminCompletedFilter() {
  return {
    status: MeasurementProfileStatus.approved,
    source: { not: MeasurementSource.profile },
    deletedAt: null,
  };
}

export function adminRejectedFilter() {
  return {
    status: MeasurementProfileStatus.rejected,
    source: { not: MeasurementSource.profile },
    deletedAt: null,
  };
}

// ── Order Measurement helpers ──────────────────────────────────────

export async function attachMeasurementToOrder(data: {
  orderId: string;
  productId: string;
  productName: string;
  measurementSnapshot: object;
}) {
  return prisma.orderItemMeasurement.create({ data });
}

export async function getOrderMeasurements(orderId: string) {
  return prisma.orderItemMeasurement.findMany({
    where: { orderId },
  });
}

export async function adminUpdateOrderMeasurement(
  measurementId: string,
  data: { measurementSnapshot: object },
  adminId: string,
  adminEmail: string
) {
  // Fetch existing record before update for audit trail
  const existing = await prisma.orderItemMeasurement.findUnique({
    where: { id: measurementId },
  });
  if (!existing) {
    throw new Error('Order measurement not found');
  }

  const updated = await prisma.orderItemMeasurement.update({
    where: { id: measurementId },
    data: {
      measurementSnapshot: data.measurementSnapshot,
      updatedBy: adminId,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: adminId,
      userEmail: adminEmail,
      action: 'MEASUREMENT_UPDATED',
      entity: 'OrderItemMeasurement',
      entityId: measurementId,
      oldValue: { measurementSnapshot: existing.measurementSnapshot },
      newValue: { measurementSnapshot: updated.measurementSnapshot },
    },
  });

  return updated;
}
