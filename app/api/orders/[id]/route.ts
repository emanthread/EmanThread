import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/permissions"; // C6

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

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

    // Admin/staff can view any order
    if (session?.user && isAdminRole(session.user.role)) {
      return NextResponse.json(order);
    }

    // Authenticated user can view their own orders
    if (session?.user?.id && order.userId === session.user.id) {
      return NextResponse.json(order);
    }

    // Guest orders: allow access with matching email verification
    if (!order.userId) {
      const url = new URL(request.url);
      const email = url.searchParams.get("email");
      if (email) {
        const addr = order.shippingAddress as Record<string, string> | null;
        if (addr?.email === email) {
          return NextResponse.json(order);
        }
      }
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    console.error("Fetch order error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
