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

    const provider = getProvider("card");
    const result = await provider.verifyCallback(payload);

    // Defense-in-depth: reject tampered callbacks explicitly in production
    if (!isSandbox && !result.success && result.failureReason?.includes("HMAC")) {
      console.error("[SECURITY] Card gateway callback HMAC verification failed in production", {
        txnRef: result.transactionId,
      });
      return NextResponse.json(
        { error: "Forbidden", code: "HMAC_VERIFICATION_FAILED" },
        { status: 403 }
      );
    }

    const txnRef = result.transactionId;
    const { prisma } = await import("@/lib/db");
    const transaction = await prisma.paymentTransaction.findFirst({
      where: { transactionRef: txnRef },
      orderBy: { createdAt: "desc" },
    });

    if (!transaction) {
      console.error("Card callback: transaction not found for ref", txnRef);
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    await updatePaymentTransaction(transaction.id, {
      status: result.status.toUpperCase(),
      gatewayResponse: payload,
      failureReason: result.failureReason,
      transactionRef: result.providerRef || txnRef,
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
              transactionRef: result.providerRef || txnRef || "",
              customerName: `${addr.firstName || ""} ${addr.lastName || ""}`.trim(),
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
    console.error("Card callback error:", error);
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