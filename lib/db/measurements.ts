import { prisma } from "@/lib/db";
import { MeasurementProfileStatus } from "@prisma/client";

// ── Centralized filters ──────────────────────────────────────────────

/**
 * Centralized filter: admin tailor requests (source = "tailor_request", not soft-deleted)
 * Single source of truth — ALL admin APIs that query tailor requests MUST use this.
 */
export function adminTailorRequestFilter() {
  return { deletedAt: null, source: "tailor_request" as const };
}

/**
 * Centralized filter: admin measurement profiles (order-linked only)
 * Only returns profiles linked to completed orders (source = "order").
 * Saved user profiles (source = "profile") are intentionally excluded — they
 * are private to the user and must NEVER appear in admin views.
 * Single source of truth — ALL admin APIs that query measurement profiles MUST use this.
 */
export function adminProfileFilter() {
  return { deletedAt: null, source: "order" as const };
}

/**
 * Centralized filter: completed measurements (order-linked + fulfilled tailor requests)
 *
 * Completed tab shows fulfilled tailor requests and order-linked measurements only.
 * Saved user profiles (source: "profile") are intentionally excluded — they live
 * in the Profiles tab regardless of status.
 */
export function adminCompletedFilter() {
  return {
    status: MeasurementProfileStatus.approved,
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
