import { NextResponse } from "next/server";
import { z } from "zod";
import { getProvider } from "@/lib/payments";
import {
  createPaymentTransaction,
  updateOrderPaymentStatus,
} from "@/lib/db-queries";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const initiateSchema = z.object({
  orderId: z.string().min(1),
  provider: z.enum(["jazzcash", "easypaisa", "card", "safepay"]),
  returnUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = initiateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { orderId, provider, returnUrl } = result.data;

    // Fetch the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only allow initiation for non-COD methods
    if (order.paymentMethod === "COD") {
      return NextResponse.json(
        { error: "COD orders do not require payment initiation" },
        { status: 400 }
      );
    }

    // Check if already paid
    if (order.paymentStatus === "PAID") {
      return NextResponse.json(
        { error: "Order already paid" },
        { status: 400 }
      );
    }

    // Build return URL
    const baseReturnUrl =
      returnUrl ||
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/payments/callback/${provider}`;

    // Initiate with provider
    const paymentProvider = getProvider(provider);
    const initiateResult = await paymentProvider.initiate({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(order.grandTotal),
      customerEmail: (order.shippingAddress as any)?.email || "",
      customerPhone: (order.shippingAddress as any)?.phone || "",
      returnUrl: baseReturnUrl,
    });

    if (!initiateResult.success || !initiateResult.redirectUrl) {
      return NextResponse.json(
        { error: initiateResult.error || "Payment initiation failed" },
        { status: 500 }
      );
    }

    // Create transaction record
    const transaction = await createPaymentTransaction({
      orderId: order.id,
      provider,
      amount: Number(order.grandTotal),
      transactionRef: initiateResult.transactionId,
      status: "INITIATED",
    });

    return NextResponse.json({
      success: true,
      redirectUrl: initiateResult.redirectUrl,
      transactionId: transaction.id,
      providerRef: initiateResult.transactionId,
    });
  } catch (error) {
    console.error("Payment initiate error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}