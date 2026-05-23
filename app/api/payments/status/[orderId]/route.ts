import { NextResponse } from "next/server";
import { getPaymentTransactionByOrderId } from "@/lib/db-queries";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, paymentStatus: true, status: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const transaction = await getPaymentTransactionByOrderId(orderId);

    return NextResponse.json({
      orderId: order.id,
      paymentStatus: order.paymentStatus.toLowerCase(),
      orderStatus: order.status.toLowerCase(),
      transaction: transaction
        ? {
            id: transaction.id,
            provider: transaction.provider,
            status: transaction.status.toLowerCase(),
            amount: transaction.amount,
            transactionRef: transaction.transactionRef,
            failureReason: transaction.failureReason,
          }
        : null,
    });
  } catch (error) {
    console.error("Payment status error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}