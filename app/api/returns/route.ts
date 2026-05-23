import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createReturnRequest } from "@/lib/db-queries";
import { createReturnRequestSchema } from "@/lib/validators/returns";
import { triggerNotification } from "@/lib/notifications";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = createReturnRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = result.data;

    // Verify order ownership
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      select: { userId: true, shippingAddress: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify order ownership — guest orders (userId=null) require admin
    if (order.userId !== session.user.id) { // FIXED: M2 — removed && guard that allowed guest orders through
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const returnRequest = await createReturnRequest(data);

    // Trigger notification
    const addr = order.shippingAddress as Record<string, string> | null;
    if (addr?.email) {
      triggerNotification({
        to: addr.email,
        phone: addr.phone,
        template: "return_request_submitted",
        data: {
          customerName: `${addr.firstName || ""} ${addr.lastName || ""}`.trim(),
          orderNumber: returnRequest.orderNumber,
          requestType: returnRequest.type,
          reason: returnRequest.reason,
          requestId: returnRequest.id,
        },
        orderId: data.orderId,
      }).catch((err) => console.error("Return notification failed:", err));
    }

    return NextResponse.json(returnRequest, { status: 201 });
  } catch (error) {
    console.error("Create return request error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}