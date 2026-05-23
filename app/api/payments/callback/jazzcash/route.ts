import { NextResponse } from "next/server";
import { getProvider, isSandbox } from "@/lib/payments";
import {
  updatePaymentTransaction,
  updateOrderPaymentStatus,
} from "@/lib/db-queries";
import { triggerNotification } from "@/lib/notifications";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function handleCallback(req: Request) {
  try {
    // JazzCash may send callbacks as GET or POST
    let payload: Record<string, string> = {};
    
    if (req.method === "POST") {
      try {
        const body = await req.json();
        payload = body as Record<string, string>;
      } catch {
        const formData = await req.formData();
        formData.forEach((value, key) => {
          payload[key] = value.toString();
        });
      }
    } else {
      const { searchParams } = new URL(req.url);
      searchParams.forEach((value, key) => {
        payload[key] = value;
      });
    }

    const provider = getProvider("jazzcash");
    const result = await provider.verifyCallback(payload);

    // Defense-in-depth: reject tampered callbacks explicitly in production
    if (!isSandbox && !result.success && result.failureReason?.includes("HMAC")) {
      console.error("[SECURITY] JazzCash callback HMAC verification failed in production", {
        txnRef: result.transactionId,
      });
      return NextResponse.json(
        { error: "Forbidden", code: "HMAC_VERIFICATION_FAILED" },
        { status: 403 }
      );
    }

    // Find the transaction by provider ref
    const orderId = payload.pp_BillReference ? undefined : undefined;
    // Since we don't have direct orderId in callback, find via transactionRef
    // For now, we look up by the txnRef
    const txnRef = result.transactionId;
    
    // Find all pending transactions for this provider ref
    const { prisma } = await import("@/lib/db");
    const transaction = await prisma.paymentTransaction.findFirst({
      where: { transactionRef: txnRef },
      orderBy: { createdAt: "desc" },
    });

    if (!transaction) {
      console.error("JazzCash callback: transaction not found for ref", txnRef);
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Update transaction
    await updatePaymentTransaction(transaction.id, {
      status: result.status.toUpperCase(),
      gatewayResponse: payload,
      failureReason: result.failureReason,
      transactionRef: result.providerRef || txnRef,
    });

    // Update order payment status on success
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
              total: String(Number(order.grandTotal)),
              transactionRef: result.providerRef || txnRef || "",
              customerName: `${addr.firstName || ""} ${addr.lastName || ""}`.trim(),
            },
            orderId: order.id,
          }).catch((err) => console.error("Payment success notification failed:", err));
        }
      }
    } else if (result.status === "failed") {
      await updateOrderPaymentStatus(transaction.orderId, "FAILED");
    }

    // Redirect to order confirmation or failure page
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectUrl = result.success
      ? `${baseUrl}/order-confirmation?order=${transaction.orderId}`
      : `${baseUrl}/checkout?error=payment_failed&order=${transaction.orderId}`;

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("JazzCash callback error:", error);
    return NextResponse.json(
      { error: "Callback processing failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return handleCallback(req);
}

export async function POST(req: Request) {
  return handleCallback(req);
}