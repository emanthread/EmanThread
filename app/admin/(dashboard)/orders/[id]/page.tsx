"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Package, User, MapPin, CreditCard, Calendar, Truck, FileText, Ruler } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminStore } from "@/lib/admin-store";
import { formatPrice } from "@/lib/data";
import { cn } from "@/lib/utils";
import { TailorPrintCard, type TailorCardData } from "@/components/admin/tailor-print-card";
import { mapFromPrismaFields } from "@/lib/validators/measurements-unified";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { buildWhatsAppUrl, normalizeWhatsAppNumber } from "@/lib/whatsapp-utils";

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

interface OrderMeasurement {
  id: string;
  productId: string;
  productName: string;
  measurementProfileId: string | null;
  measurementSnapshot: {
    profileName?: string;
    garmentType?: string;
    measurements?: Record<string, string>;
    stylingPrefs?: Record<string, unknown>;
    notes?: string;
    stitchingVariantName?: string;
  };
  measurementProfile?: {
    profileName: string;
    garmentType: string;
  } | null;
}

export default function AdminOrderDetails({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { orders, loadOrders } = useAdminStore();
  const [loading, setLoading] = useState(true);
  const [orderMeasurements, setOrderMeasurements] = useState<OrderMeasurement[]>([]);
  const [measurementsLoading, setMeasurementsLoading] = useState(true);
  const { toast } = useToast();

  const order = orders.find((o) => o.id === resolvedParams.id);
  const [delayNote, setDelayNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (order) {
      setDelayNote(order.notes || "");
    }
  }, [order]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (orders.length === 0) {
        await loadOrders();
      }
      setLoading(false);
    };
    fetchOrders();
  }, [orders.length, loadOrders]);

  useEffect(() => {
    if (!loading) {
      fetch(`/api/admin/orders/${resolvedParams.id}/measurements`)
        .then((r) => r.json())
        .then((data) => {
          if (data.measurements) setOrderMeasurements(data.measurements);
        })
        .catch(() => {})
        .finally(() => setMeasurementsLoading(false));
    }
  }, [loading, resolvedParams.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {(() => {
        const stitchingFee = Number(order.stitchingFee || 0);
        const shippingCost = Number(order.shippingCost || 0);
        const subtotal = Number(order.subtotal || 0);
        const grandTotal = Number(order.total || 0);
      
        const dueOnDelivery = stitchingFee > 0 ? stitchingFee + shippingCost : shippingCost;
        const payNow = stitchingFee > 0 ? subtotal : grandTotal;
        return (
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
              {order.items.map((item, index) => {
                const itemMeasurement = orderMeasurements.find(m => m.productId === item.productId);
                const variantName = itemMeasurement?.measurementSnapshot?.stitchingVariantName;
                
                return (
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
                      {variantName && (
                        <span className="inline-block text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1 mb-1">
                          ✨ {variantName}
                        </span>
                      )}
                      <p className="text-sm text-muted-foreground">Code: {item.sku}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Qty: {item.quantity} × {formatPrice(item.price)}
                      </p>
                    </div>
                    <div className="text-right font-medium">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                );
              })}
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
              
              {stitchingFee > 0 && (
                <>
                  <div className="border-t border-border/50 my-2 pt-2"></div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid Amount (Fabric)</span>
                    <span className="font-semibold">{formatPrice(payNow)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Due on Delivery (Stitching + Shipping)</span>
                    <span className="font-semibold">{formatPrice(dueOnDelivery)}</span>
                  </div>
                </>
              )}

              <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-0.5">Payment Method</p>
                  <p className="font-medium">{paymentMethodLabels[order.paymentMethod] || order.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-0.5">Payment Status</p>
                  <Badge variant="outline" className={cn("capitalize", order.paymentStatus === "paid" && "border-green-500 text-green-600", order.paymentStatus === "pending" && "border-yellow-500 text-yellow-600", order.paymentStatus === "failed" && "border-red-500 text-red-600")}>
                    {order.paymentStatus}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stitching Measurements */}
          {!measurementsLoading && orderMeasurements.length > 0 && (() => {
            // Deduplicate by productId so existing duplicate records don't spam the UI
            const uniqueMeasurements = Array.from(
              new Map(orderMeasurements.map(om => [om.productId, om])).values()
            );
            return (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ruler className="h-5 w-5 text-muted-foreground" />
                  Stitching Measurements ({uniqueMeasurements.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {uniqueMeasurements.map((om) => {
                  const snapshot = om.measurementSnapshot || {};
                  const profile = om.measurementProfile;
                  const rawM = (snapshot.measurements || {}) as Record<string, unknown>;
                  const m = mapFromPrismaFields(rawM) as Record<string, any>;
                  const profileName = profile?.profileName || snapshot.profileName || "Measurement";
                  const garmentType = profile?.garmentType || snapshot.garmentType || "";
                  
                  const cardData: TailorCardData = {
                    serialNo: `ORD-${order.orderNumber}`,
                    customerName: order.customerName,
                    deliveryDate: new Date(order.createdAt).toLocaleDateString(),
                    productName: om.productName,
                    garmentType: garmentType,
                    measurements: m,
                    stylingPrefs: snapshot.stylingPrefs || null,
                    notes: snapshot.notes || null,
                  };

                  return (
                    <div key={om.id} className="border rounded-lg p-4 space-y-4 bg-muted/10">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">
                            {om.productName} <span className="text-muted-foreground font-normal">— {profileName}</span>
                          </p>
                          {garmentType && <p className="text-xs text-muted-foreground capitalize">{garmentType.replace(/_/g, " ")}</p>}
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto pb-4">
                        <TailorPrintCard data={cardData} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            );
          })()}

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
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-0.5">Contact Info</p>
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
              <div className="text-sm space-y-0.5">
                <p className="font-medium">{order.customerName}</p>
                <p>{order.shippingAddress?.address}</p>
                <p>{order.shippingAddress?.city}{order.shippingAddress?.province ? `, ${order.shippingAddress.province}` : ''}</p>
                <p>Pakistan {order.shippingAddress?.postalCode}</p>
              </div>
            </CardContent>
          </Card>

          {/* Delay Management */}
          <Card className="border-amber-200 bg-amber-50/5 dark:bg-amber-950/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-500">
                <Ruler className="h-5 w-5" />
                Delay Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="delayNote" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Order Note (Shown to Customer)
                </label>
                <Textarea
                  id="delayNote"
                  value={delayNote}
                  onChange={(e) => setDelayNote(e.target.value)}
                  placeholder="e.g., Stitching is in progress, but we are facing high order volumes. Estimated completion is delayed by 5 days."
                  rows={3}
                  maxLength={500}
                  className="bg-background border-amber-200/60 focus-visible:ring-amber-500"
                />
                <p className="text-[11px] text-muted-foreground">
                  This message is visible to the customer on their order details card.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  onClick={async () => {
                    setSavingNote(true);
                    try {
                      const res = await fetch(`/api/admin/orders/${order.id}/note`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ note: delayNote }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Failed to save note");
                      toast({
                        title: "Note Saved",
                        description: "The order note has been updated successfully.",
                      });
                      await loadOrders();
                    } catch (err) {
                      toast({
                        title: "Error",
                        description: err instanceof Error ? err.message : "Failed to update note",
                        variant: "destructive",
                      });
                    } finally {
                      setSavingNote(false);
                    }
                  }}
                  disabled={savingNote}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Save Note
                </Button>
                {order.customerPhone && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const message = `Hi ${order.customerName},\n\nThis is Eman Thread. Regarding your stitching order #${order.orderNumber}, we are currently experiencing a rush of stitching orders. Due to this high volume, your order may be slightly delayed. We expect to complete and ship it soon and apologize for any inconvenience.\n\nThank you for your patience!`;
                      const normalizedPhone = normalizeWhatsAppNumber(order.customerPhone);
                      window.open(buildWhatsAppUrl(normalizedPhone, message), "_blank");
                    }}
                    className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                  >
                    Message on WhatsApp
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      );
      })()}
    </div>
  );
}