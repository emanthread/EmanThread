"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Package, User, MapPin, CreditCard, Calendar, Truck, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminStore } from "@/lib/admin-store";
import { formatPrice } from "@/lib/data";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-700" },
  shipped: { label: "Shipped", color: "bg-purple-100 text-purple-700" },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
  returned: { label: "Returned", color: "bg-gray-100 text-gray-700" },
};

const paymentMethodLabels: Record<string, string> = {
  cod: "Cash on Delivery",
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  card: "Credit/Debit Card",
};

export default function AdminOrderDetails({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { orders, loadOrders } = useAdminStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (orders.length === 0) {
        await loadOrders();
      }
      setLoading(false);
    };
    fetchOrders();
  }, [orders.length, loadOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const order = orders.find((o) => o.id === resolvedParams.id);

  if (!order) {
    return (
      <div className="text-center py-12 space-y-4">
        <Package className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Order Not Found</h2>
        <p className="text-muted-foreground">The order you are looking for does not exist or has been deleted.</p>
        <Button asChild>
          <Link href="/admin/orders">Back to Orders</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            Order {order.orderNumber}
            <Badge variant="secondary" className={cn(statusConfig[order.status]?.color || "bg-gray-100")}>
              {statusConfig[order.status]?.label || order.status}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                Order Items ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-start gap-4 py-2 border-b last:border-0 last:pb-0">
                  <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted shrink-0">
                    <Image
                      src={item.productImage}
                      alt={item.productName}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Qty: {item.quantity} × {formatPrice(item.price)}
                    </p>
                  </div>
                  <div className="text-right font-medium">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Payment & Totals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping Fee</span>
                <span>{formatPrice(order.shippingCost)}</span>
              </div>
              {order.stitchingFee && order.stitchingFee > 0 ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stitching Fee</span>
                  <span className="text-amber-600 font-medium">{formatPrice(order.stitchingFee)}</span>
                </div>
              ) : null}
              {order.discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="pt-3 border-t flex justify-between font-medium text-lg">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>

              <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Payment Method</p>
                  <p className="font-medium">{paymentMethodLabels[order.paymentMethod] || order.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Payment Status</p>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "capitalize",
                      order.paymentStatus === "paid" && "border-green-500 text-green-600",
                      order.paymentStatus === "pending" && "border-yellow-500 text-yellow-600",
                      order.paymentStatus === "failed" && "border-red-500 text-red-600"
                    )}
                  >
                    {order.paymentStatus}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  Order Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm bg-muted/50 p-4 rounded-md whitespace-pre-wrap">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{order.customerName}</p>
                <p className="text-sm text-muted-foreground">Customer ID: {order.customerId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Contact Info</p>
                <p className="text-sm font-medium">{order.customerEmail}</p>
                <p className="text-sm font-medium">{order.customerPhone}</p>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1">
                <p className="font-medium">{order.customerName}</p>
                <p>{order.shippingAddress?.address}</p>
                <p>{order.shippingAddress?.city}{order.shippingAddress?.province ? `, ${order.shippingAddress.province}` : ''}</p>
                <p>Pakistan {order.shippingAddress?.postalCode}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
