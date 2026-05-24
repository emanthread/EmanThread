import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { withLoggedAdminHandler } from "@/lib/logger";
import { hasPermission, type RoleValue } from "@/lib/permissions";

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
      include: {
        items: {
          include: {
            product: {
              select: { name: true, images: true, fabricType: true, sku: true },
            },
          },
        },
        manualPayment: true,
        itemMeasurements: {
          include: { measurementProfile: true },
        },
        notificationLogs: {
          orderBy: { createdAt: "desc" },
        },
        returnRequests: {
          include: { items: true },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
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
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
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

    // Delete associated return requests first (they don't have onDelete: Cascade on the Order relation)
    await prisma.returnRequestItem.deleteMany({
      where: { returnRequest: { orderId: id } },
    });
    await prisma.returnRequest.deleteMany({
      where: { orderId: id },
    });

    // Delete the order (cascade handles OrderItem, PaymentTransaction, NotificationLog, OrderItemMeasurement, ManualPaymentSubmission)
    await prisma.order.delete({
      where: { id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email!,
        action: "ORDER_DELETED",
        entity: "Order",
        entityId: order.orderNumber,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete order error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
