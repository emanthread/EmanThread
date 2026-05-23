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