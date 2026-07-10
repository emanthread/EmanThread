import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Clock, XCircle, AlertTriangle, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/data";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

async function getOrderStatus(orderIdentifier: string) {
  let order = await prisma.order.findUnique({
    where: { id: orderIdentifier },
    include: {
      items: { include: { product: { select: { name: true, images: true } } } },
      itemMeasurements: true,
      manualPayment: true,
    },
  });

  if (!order) {
    order = await prisma.order.findUnique({
      where: { orderNumber: orderIdentifier },
      include: {
        items: { include: { product: { select: { name: true, images: true } } } },
        itemMeasurements: true,
        manualPayment: true,
      },
    });
  }

  return order;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "PENDING_VERIFICATION": return { label: "Pending Verification", color: "bg-amber-100 text-amber-700", icon: Clock };
    case "PENDING": return { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock };
    case "PROCESSING": return { label: "Processing", color: "bg-blue-100 text-blue-700", icon: Hourglass };
    case "SHIPPED": return { label: "Shipped", color: "bg-purple-100 text-purple-700", icon: AlertTriangle };
    case "DELIVERED": return { label: "Delivered", color: "bg-green-100 text-green-700", icon: CheckCircle };
    case "CANCELLED": return { label: "Cancelled", color: "bg-red-100 text-red-700", icon: XCircle };
    case "PAID": return { label: "Paid", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle };
    case "FAILED": return { label: "Failed", color: "bg-red-100 text-red-700", icon: XCircle };
    default: return { label: status, color: "bg-gray-100 text-gray-700", icon: Clock };
  }
}

export default async function OrderStatusPage({ params }: PageProps) {
  const { orderId } = await params;
  const order = await getOrderStatus(orderId);

  if (!order) notFound();

  const paymentStatusBadge = getStatusBadge(order.paymentStatus);
  const orderStatusBadge = getStatusBadge(order.status);
  const manualPayment = order.manualPayment;
  const addr = order.shippingAddress as Record<string, string> | null;

  const stitchingFee = Number(order.stitchingFee || 0);
  const shippingCost = Number(order.shippingCost || 0);
  const subtotal = Number(order.subtotal || 0);
  const grandTotal = Number(order.grandTotal || 0);

  const dueOnDelivery = stitchingFee > 0 ? stitchingFee + shippingCost : shippingCost;
  const payNow = stitchingFee > 0 ? subtotal : grandTotal;

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold">Order Status</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">{order.orderNumber}</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Payment Status</p>
              <Badge className={`${paymentStatusBadge.color} border-0`}>
                {paymentStatusBadge.label}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Order Status</p>
              <Badge className={`${orderStatusBadge.color} border-0`}>
                {orderStatusBadge.label}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Payment under review banner */}
        {order.paymentStatus === "PENDING_VERIFICATION" && manualPayment?.status === "PENDING" && (
          <Card className="mb-6 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Clock className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800 mb-1">Payment Under Review</h3>
                  <p className="text-sm text-amber-700">
                    Your payment is being verified by our team. Typical verification time: 1-3 hours.
                    You'll receive an email once confirmed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Expired */}
        {manualPayment?.status === "EXPIRED" && (
          <Card className="mb-6 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <XCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-800 mb-1">Payment Verification Window Expired</h3>
                  <p className="text-sm text-red-700">
                    The payment verification period has expired. Please place a new order or contact support.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Details */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order Number</span>
              <span className="font-mono font-medium">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span>{order.createdAt.toISOString().split("T")[0]}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {shippingCost > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatPrice(shippingCost)}</span>
              </div>
            )}
            {stitchingFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Stitching Fee</span>
                <span>{formatPrice(stitchingFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Total</span>
              <span className="font-semibold">{formatPrice(grandTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment Method</span>
              <span>{order.paymentMethod}</span>
            </div>
            {stitchingFee > 0 && (
              <>
                <div className="border-t border-border/50 my-2 pt-2"></div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pay Now (Fabric)</span>
                  <span className="font-semibold">{formatPrice(payNow)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Due on Delivery (Stitching + Shipping)</span>
                  <span className="font-semibold">{formatPrice(dueOnDelivery)}</span>
                </div>
              </>
            )}
            {manualPayment && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono">{manualPayment.transactionId}</span>
                </div>
                {manualPayment.status === "REJECTED" && manualPayment.rejectionReason && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Rejection Reason</span>
                    <span className="text-red-600">{manualPayment.rejectionReason}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item) => {
              const itemMeasurement = order.itemMeasurements?.find((m) => m.orderItemId === item.id);
              const measurementData = itemMeasurement?.measurementSnapshot as Record<string, any> | null;
              const variantName = measurementData?.stitchingVariantName;
              const variantPrice = measurementData?.stitchingPrice;
              
              return (
                <div key={item.id} className="flex justify-between text-sm">
                  <div className="flex flex-col">
                    <span>{item.product.name} × {item.quantity}</span>
                    {variantName && (
                      <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded w-fit mt-1 border border-amber-200">
                        ✨ {variantName}
                      </span>
                    )}
                  </div>
                  <span className="font-medium">{formatPrice(Number(item.priceAtTimeOfPurchase) * item.quantity)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Shipping Info */}
        {addr && (
          <Card className="mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1 text-muted-foreground">
              <p>{addr.firstName} {addr.lastName}</p>
              <p>{addr.address}</p>
              <p>{addr.city}, {addr.province}</p>
              <p>{addr.email} | {addr.phone}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-center">
          <Button asChild variant="outline">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}