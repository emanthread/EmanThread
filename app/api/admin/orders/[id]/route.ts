import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { withLoggedAdminHandler } from "@/lib/logger";
import { hasPermission, type RoleValue } from "@/lib/permissions";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

export const GET = withLoggedAdminHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth();
  const userRole = session?.user?.role;
  const userPerms = session?.user?.permissions;
  const customPerms = userPerms ? JSON.stringify(userPerms) : undefined;

  if (
    !session?.user ||
    !hasPermission(userRole as RoleValue, "VIEW_ORDERS", customPerms)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        subtotal: true,
        shippingCost: true,
        discountAmount: true,
        couponCode: true,
        grandTotal: true,
        paymentMethod: true,
        paymentStatus: true,
        notes: true,
        shippingAddress: true,
        stitchingFee: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        items: {
          include: {
            product: {
              select: { name: true, images: true, fabricType: true, sku: true },
            },
          },
        },
        manualPayment: true,
        itemMeasurements: true,
        notificationLogs: {
          orderBy: { createdAt: "desc" },
          select: { id: true, status: true, template: true, createdAt: true },
        },
        returnRequests: {
          include: { items: true },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          select: { id: true, amount: true, status: true, provider: true, createdAt: true },
        },
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Get order details error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});

export const DELETE = withLoggedAdminHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth();
  const userRole = session?.user?.role;
  const userPerms = session?.user?.permissions;
  const customPerms = userPerms ? JSON.stringify(userPerms) : undefined;

  if (
    !session?.user ||
    !hasPermission(userRole as RoleValue, "MANAGE_ORDERS", customPerms)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Verify the order exists
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, orderNumber: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Atomically delete all related records to prevent orphans
    await prisma.$transaction([
      prisma.returnRequestItem.deleteMany({ where: { returnRequest: { orderId: id } } }),
      prisma.returnRequest.deleteMany({ where: { orderId: id } }),
      // Cascade handles: OrderItem, PaymentTransaction, NotificationLog,
      // OrderItemMeasurement, ManualPaymentSubmission
      prisma.order.delete({ where: { id } }),
    ]);

    // Audit log (outside transaction — not critical for data integrity)
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email!,
        action: 'ORDER_STATUS_CHANGED',
        entity: "Order",
        entityId: order.orderNumber,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete order error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
