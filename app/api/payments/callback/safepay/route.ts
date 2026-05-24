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
    // Safepay sends callbacks as GET (redirect) or POST (webhook)
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

    const provider = getProvider("safepay");
    const result = await provider.verifyCallback(payload);

    // Reject tampered callbacks explicitly in production
    if (!isSandbox && !result.success && result.failureReason?.includes("signature")) {
      console.error("[SECURITY] Safepay callback signature verification failed in production", {
        trackerToken: result.transactionId,
      });
      return NextResponse.json(
        { error: "Forbidden", code: "SIGNATURE_VERIFICATION_FAILED" },
        { status: 403 }
      );
    }

    // Safepay sends tracker token as "tracker" or "tracker_token"
    const trackerToken = payload.tracker || payload.tracker_token || result.transactionId;

    // Look up the transaction by tracker token (stored as transactionRef during initiate)
    const { prisma } = await import("@/lib/db");
    const transaction = await prisma.paymentTransaction.findFirst({
      where: { transactionRef: trackerToken },
      orderBy: { createdAt: "desc" },
    });

    if (!transaction) {
      console.error("Safepay callback: transaction not found for tracker", trackerToken);
      // Still redirect gracefully instead of leaving the user on a blank page
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      return NextResponse.redirect(`${baseUrl}/checkout?error=payment_failed`);
    }

    // Update transaction record
    await updatePaymentTransaction(transaction.id, {
      status: result.status.toUpperCase(),
      gatewayResponse: payload,
      failureReason: result.failureReason,
      transactionRef: result.providerRef || trackerToken,
    });

    // Update order on success
    if (result.success) {
      await updateOrderPaymentStatus(transaction.orderId, "PAID");

      // Fire payment success notification
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
              transactionRef: result.providerRef || trackerToken || "",
              customerName: `${addr.firstName || ""} ${addr.lastName || ""}`.trim(),
            },
            orderId: order.id,
            channels: ["sms"],
          });
        }
      }
    } else if (result.status === "failed") {
      await updateOrderPaymentStatus(transaction.orderId, "FAILED");
    }

    // Redirect customer to confirmation or failure page
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectUrl = result.success
      ? `${baseUrl}/order-confirmation?order=${transaction.orderId}`
      : `${baseUrl}/checkout?error=payment_failed&order=${transaction.orderId}`;

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Safepay callback error:", error);
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return NextResponse.redirect(`${baseUrl}/checkout?error=payment_failed`);
  }
}

export async function GET(req: Request) {
  return handleCallback(req);
}

export async function POST(req: Request) {
  return handleCallback(req);
}
