import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/permissions"; // C9
import { updateOrderStatus, createAuditLog } from "@/lib/db-queries";
import { triggerNotification } from "@/lib/notifications";
import { prisma } from "@/lib/db";
import { withLoggedAdminHandler } from "@/lib/logger";

export const dynamic = "force-dynamic";

const updateStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ]),
});

const statusToTemplate: Record<string, string> = {
  SHIPPED: "order_shipped",
  DELIVERED: "order_delivered",
  CANCELLED: "order_cancelled",
};

export const PUT = withLoggedAdminHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) { // FIXED: C9
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const result = updateStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    // Get old status for audit log
    const oldOrder = await prisma.order.findUnique({
      where: { id },
      select: { status: true, orderNumber: true },
    });

    // A3.1: Validate allowed status transitions
    const VALID_TRANSITIONS: Record<string, string[]> = {
      PENDING: ["PROCESSING", "CANCELLED"],
      PROCESSING: ["SHIPPED", "CANCELLED"],
      SHIPPED: ["DELIVERED"],
      DELIVERED: [],
      CANCELLED: [],
    };
    const oldStatus = oldOrder?.status as string;
    if (oldStatus && !VALID_TRANSITIONS[oldStatus]?.includes(result.data.status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${oldStatus} to ${result.data.status}` },
        { status: 400 }
      );
    }

    const updated = await updateOrderStatus(id, result.data.status);

    // Audit log
    void createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      action: "ORDER_STATUS_CHANGED",
      entity: "Order",
      entityId: id,
      oldValue: { status: oldOrder?.status },
      newValue: { status: result.data.status, orderNumber: oldOrder?.orderNumber },
    });

    // Trigger status notification if applicable
    const template = statusToTemplate[result.data.status];
    if (template) {
      const order = await prisma.order.findUnique({ where: { id } });
      if (order) {
        const addr = order.shippingAddress as Record<string, string> | null;
        if (addr?.email) {
          triggerNotification({
            to: addr.email,
            phone: addr.phone,
            template: template as any,
            data: {
              orderNumber: order.orderNumber,
              total: String(Number(order.grandTotal)),
              customerName: `${addr.firstName || ""} ${addr.lastName || ""}`.trim(),
              trackingNumber: "",
              estimatedDelivery: "3-5 business days",
              cancellationReason: "Cancelled by admin",
            },
            orderId: id,
          }).catch((err) => console.error("Status notification failed:", err));
        }
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update order status error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
