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

    const provider = getProvider("safepay");
    const result = await provider.verifyCallback(payload);

    if (!isSandbox && !result.success && result.failureReason?.includes("signature")) {
      console.error("[SECURITY] Safepay callback signature verification failed", {
        txnRef: result.transactionId,
      });
      return NextResponse.json(
        { error: "Forbidden", code: "SIGNATURE_VERIFICATION_FAILED" },
        { status: 403 }
      );
    }

    const tracker = result.transactionId || payload.tracker;
    if (!tracker) {
      return NextResponse.json({ error: "Missing tracker" }, { status: 400 });
    }

    const { prisma } = await import("@/lib/db");
    const transaction = await prisma.paymentTransaction.findFirst({
      where: { transactionRef: tracker },
      orderBy: { createdAt: "desc" },
    });

    if (!transaction) {
      console.error("Safepay callback: transaction not found for tracker", tracker);
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    await updatePaymentTransaction(transaction.id, {
      status: result.status.toUpperCase(),
      gatewayResponse: payload,
      failureReason: result.failureReason,
      transactionRef: result.providerRef || tracker,
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
              transactionRef: result.providerRef || tracker || "",
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
    console.error("Safepay callback error:", error);
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