import { NextResponse, after } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { RateLimits } from "@/lib/rate-limiter";
import { sendDeliveryUpdateParallel } from "@/lib/notifications";
import { sendAdminOrderCancelledAlert } from "@/lib/notifications/admin-alerts";
import { sanitizeDbError } from "@/lib/utils/errors";
import { createAuditLog } from "@/lib/db-queries";
import { withGuard } from "@/lib/api-guards";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { syncProductsAfterVariantStockChange } from "@/lib/db/product-inventory";
export const dynamic = "force-dynamic";

const cancelOrderSchema = z.object({
  reason: z.string().max(200).optional(),
});

export const PATCH = withGuard(
  async (
    req: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      // Auth Check (already verified by withGuard, but needed for session object)
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const result = cancelOrderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const reason = result.data.reason || "Cancelled by user";

    // 3. Fetch order details to check status and ownership
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

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check ownership
    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check status: only allow canceling PENDING orders
    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "Cannot cancel an order that is already processing" },
        { status: 400 }
      );
    }

    // Option configurations are in an additive table and must never be read
    // on an un-migrated deployment. Legacy order lines intentionally keep the
    // current product-stock restoration path below.
    const variantByOrderItemId = new Map<string, string>();
    if (FEATURE_FLAGS.COMMERCE_PROFILE_V1 && order.items.length > 0) {
      const configurations = await prisma.orderItemConfiguration.findMany({
        where: { orderItemId: { in: order.items.map((item) => item.id) } },
        select: { orderItemId: true, productVariantId: true },
      });
      for (const configuration of configurations) {
        if (configuration.productVariantId) {
          variantByOrderItemId.set(configuration.orderItemId, configuration.productVariantId);
        }
      }
    }

    // 4. Perform the update and stock restoration in a transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: "CANCELLED",
          notes: reason,
        },
      });

      // Restore stock
      const changedVariantProductIds = new Set<string>();
      for (const item of order.items) {
        const variantId = variantByOrderItemId.get(item.id);
        if (variantId) {
          // Manual-payment orders have not deducted variant stock yet. Keep
          // the existing legacy cancellation behavior for old product lines.
          if (order.paymentStatus !== "PENDING_VERIFICATION") {
            await tx.productVariant.updateMany({
              where: { id: variantId },
              data: {
                stockQuantity: { increment: item.quantity },
                inStock: true,
              },
            });
            changedVariantProductIds.add(item.productId);
          }
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

      return updated;
    });

    // 5. Create Audit Log
    void createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      action: "ORDER_STATUS_CHANGED",
      entity: "Order",
      entityId: id,
      oldValue: { status: order.status },
      newValue: { status: "CANCELLED", notes: reason, orderNumber: order.orderNumber },
    });

    // 6. Send cancellation notification in parallel background task
    const addr = order.shippingAddress as Record<string, string> | null;
    if (addr?.email) {
      after(async () => {
        try {
          await sendDeliveryUpdateParallel({
            to: addr.email,
            phone: addr.phone || undefined,
            template: "order_cancelled",
            data: {
              orderNumber: order.orderNumber,
              total: String(Number(order.grandTotal)),
              customerName: `${addr.firstName || ""} ${addr.lastName || ""}`.trim(),
              trackingNumber: "",
              estimatedDelivery: "",
              cancellationReason: reason,
              paymentMethod: order.paymentMethod || "",
            },
            orderId: id,
          });
        } catch (err) {
          console.error("[notifications] Failed to send order cancellation notification:", err);
        }

        // Send active admin alert email
        try {
          await sendAdminOrderCancelledAlert({
            orderId: id,
            orderNumber: order.orderNumber,
            amount: String(Number(order.grandTotal)),
            customerName: `${addr.firstName || ""} ${addr.lastName || ""}`.trim(),
            reason: reason,
          });
        } catch (err) {
          console.error("[admin-alerts] Failed to send admin cancellation alert:", err);
        }
      });
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("Cancel order error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
}, { requireAuth: true, rateLimit: RateLimits.order() });
