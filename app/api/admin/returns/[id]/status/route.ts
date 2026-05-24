import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/permissions"; // C9
import { updateReturnRequestStatus, createAuditLog } from "@/lib/db-queries";
import { updateReturnRequestStatusSchema } from "@/lib/validators/returns";
import { triggerNotification } from "@/lib/notifications";
import { prisma } from "@/lib/db";
import { withLoggedAdminHandler } from "@/lib/logger";

export const dynamic = "force-dynamic";

export const PUT = withLoggedAdminHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) { // FIXED: C9 — was lowercase "admin"
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const result = updateReturnRequestStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const updated = await updateReturnRequestStatus(
      id,
      result.data,
      session.user.id
    );

    // Audit log — only map statuses that exist in the AuditAction enum
    const actionMap: Record<string, string> = {
      APPROVED: "RETURN_APPROVED",
      REJECTED: "RETURN_REJECTED",
      COMPLETED: "RETURN_COMPLETED",
      CANCELLED: "ORDER_STATUS_CHANGED",
      PENDING: "ORDER_STATUS_CHANGED",
    };
    void createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      action: actionMap[result.data.status] || "ORDER_STATUS_CHANGED",
      entity: "ReturnRequest",
      entityId: id,
      newValue: { status: result.data.status, notes: result.data.notes, refundAmount: result.data.refundAmount },
    });

    // Trigger notification
    const request = await prisma.returnRequest.findUnique({
      where: { id },
      include: { order: true, user: true },
    });

    if (request) {
      const addr = request.order.shippingAddress as Record<string, string> | null;
      // Only send notifications for statuses that have defined templates
      const templateMap: Record<string, string> = {
        APPROVED: "return_request_approved",
        REJECTED: "return_request_rejected",
        COMPLETED: "return_request_completed",
      };
      const template = templateMap[result.data.status];
      if (template && addr?.email) {
        triggerNotification({
          to: addr.email,
          phone: addr.phone,
          template: template as any,
          data: {
            customerName: `${addr.firstName || ""} ${addr.lastName || ""}`.trim(),
            orderNumber: request.order.orderNumber,
            requestType: request.type.toLowerCase(),
            requestId: id,
            reason: request.reason,
            nextSteps: "Our courier will contact you for pickup.",
            rejectionReason: result.data.notes || "Does not meet return policy",
            refundAmount: String(updated.refundAmount || "0"),
            completionNote:
              request.type === "REFUND"
                ? "Your refund has been processed to your original payment method."
                : "Your exchange item will be shipped shortly.",
          },
          orderId: request.orderId,
          channels: ["sms"],
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update return request status error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});