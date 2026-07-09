import { NextResponse } from "next/server";
import { getProvider } from "@/lib/payments";
import {
  updatePaymentTransaction,
  updateOrderPaymentStatus,
} from "@/lib/db-queries";
import { triggerNotification } from "@/lib/notifications";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing session_id parameter" },
        { status: 400 }
      );
    }

    const provider = getProvider("card");
    const result = await provider.verifyCallback({ session_id: sessionId });

    const { prisma } = await import("@/lib/db");
    const transaction = await prisma.paymentTransaction.findFirst({
      where: { transactionRef: sessionId },
      orderBy: { createdAt: "desc" },
    });

    if (!transaction) {
      console.error("Stripe callback: transaction not found for session", sessionId);
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    await updatePaymentTransaction(transaction.id, {
      status: result.status.toUpperCase(),
      failureReason: result.failureReason,
      transactionRef: result.providerRef || sessionId,
    });

    if (result.success) {
      await updateOrderPaymentStatus(transaction.orderId, "PAID");

      // Trigger payment success notification
      const order = await prisma.order.findUnique({
        where: { id: transaction.orderId },
      });
      if (order) {
        const addr = order.shippingAddress as Record<string, string> | null;
        if (addr?.email) {
          triggerNotification({
            to: addr.email,
            phone: addr.phone,
            template: "payment_success",
            data: {
              orderNumber: order.orderNumber,
              total: String(Number(transaction.amount)),
              transactionRef: result.providerRef || sessionId || "",
              customerName: `${addr.firstName || ""} ${addr.lastName || ""}`.trim(),
              ...(order.stitchingDeliveryDate
                ? { stitchingDeliveryDate: new Date(order.stitchingDeliveryDate).toISOString() }
                : {}),
            },
            orderId: order.id,
            channels: ["email"], // explicitly only send email, to avoid duplicate SMS with order_confirmation
          });
        }
      }
    } else if (result.status === "failed") {
      await updateOrderPaymentStatus(transaction.orderId, "FAILED");
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectUrl = result.success
      ? `${baseUrl}/order-confirmation?order=${transaction.orderId}`
      : `${baseUrl}/checkout?error=payment_failed&order=${transaction.orderId}`;

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Stripe callback error:", error);
    return NextResponse.json(
      { error: "Callback processing failed" },
      { status: 500 }
    );
  }
}