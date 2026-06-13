"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Package, Truck, CheckCircle, Clock, Eye, RefreshCcw, Loader2, MessageCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { useAuthStore } from "@/lib/auth-store";
import { formatPrice } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { buildWhatsAppUrl, fetchWhatsAppNumber } from "@/lib/whatsapp-utils";

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  subtotal: number;
  shippingCost: number;
  stitchingFee?: number;
  discountAmount?: number;
  total: number;
  notes?: string | null;
  items: {
    id: string;
    name: string;
    image: string;
    quantity: number;
    price: number;
  }[];
}

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-700", icon: Package },
  shipped: { label: "Shipped", color: "bg-purple-100 text-purple-700", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: Clock },
};

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();

  // Return request dialog state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [returnType, setReturnType] = useState<"REFUND" | "EXCHANGE">("REFUND");
  const [returnReason, setReturnReason] = useState("OTHER");
  const [returnNotes, setReturnNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnRequests, setReturnRequests] = useState<any[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState<string>("");

  // Cancel order state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("Changed my mind");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    fetch("/api/orders/user")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch orders");
      })
      .then((data) => {
        setOrders(data);
      })
      .catch((err) => {
        console.error("Error fetching orders:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/returns/user")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch return requests");
      })
      .then((data) => {
        setReturnRequests(data || []);
      })
      .catch((err) => console.error("Error fetching returns:", err));
  }, [isAuthenticated]);

  useEffect(() => {
    fetchWhatsAppNumber().then((num) => {
      if (num) setWhatsappNumber(num);
    });
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <>
        <Header />
        <CartDrawer />
        <main className="min-h-screen bg-muted/30 pt-28 pb-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-24">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return ["pending", "processing", "shipped"].includes(order.status);
    if (activeTab === "completed") return order.status === "delivered";
    if (activeTab === "returns") return false;
    return true;
  });

  return (
    <>
      <Header />
      <CartDrawer />

      <main className="min-h-screen bg-muted/30 pt-28 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <Link
            href="/account"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Account
          </Link>

          <h1 className="text-3xl font-serif mb-6">My Orders</h1>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Orders</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="returns">Returns</TabsTrigger>
            </TabsList>
          </Tabs>
          {/* Orders List */}
          <div className="space-y-4">
            {activeTab === "returns" ? (
              returnRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <RefreshCcw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">No return requests found</p>
                    <p className="text-muted-foreground mb-6">
                      You haven&apos;t submitted any return or exchange requests.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                returnRequests.map((req) => (
                  <Card key={req.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50 py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-base font-medium">
                            Return Request for {req.orderNumber || req.order?.orderNumber}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Requested on {new Date(req.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="secondary" className="capitalize">
                          {req.status?.toLowerCase() || "Pending"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="py-4">
                      <div className="space-y-2 text-sm">
                        <p><strong>Type:</strong> {req.type}</p>
                        <p><strong>Reason:</strong> {req.reason}</p>
                        {req.notes && <p><strong>Notes:</strong> {req.notes}</p>}
                        {req.refundAmount && <p><strong>Refund Amount:</strong> {formatPrice(req.refundAmount)}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )
            ) : filteredOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No orders found</p>
                  <p className="text-muted-foreground mb-6">
                    You haven&apos;t placed any orders yet.
                  </p>
                  <Button asChild>
                    <Link href="/shop">Start Shopping</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredOrders.map((order) => {
                const StatusIcon = statusConfig[order.status]?.icon || Package;
                return (
                  <Card key={order.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50 py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-base font-medium">
                            {order.orderNumber}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Placed on {new Date(order.date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn("gap-1", statusConfig[order.status].color)}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig[order.status].label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="py-4">
                      {/* Order Items */}
                      <div className="space-y-3 mb-4">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-4">
                            <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted shrink-0">
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Qty: {item.quantity} × {formatPrice(item.price)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs md:text-sm text-amber-800 dark:text-amber-400 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-amber-900 dark:text-amber-300">Update from Tailor:</span>{" "}
                            {order.notes}
                          </div>
                        </div>
                      )}

                      {order.status === "processing" && (
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg text-xs md:text-sm text-blue-800 dark:text-blue-400 flex items-start gap-2">
                          <Clock className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-500 mt-0.5" />
                          <div>
                            Your order is already being processed. To request a cancellation, please{" "}
                            <a
                              href={buildWhatsAppUrl(
                                whatsappNumber,
                                `Hi, I would like to request cancellation for order ${order.orderNumber}.`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold underline text-blue-950 dark:text-blue-300 hover:text-blue-700"
                            >
                              contact us on WhatsApp
                            </a>
                            .
                          </div>
                        </div>
                      )}

                      {/* Order Total & Actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t gap-4">
                        <div className="space-y-1 w-full sm:w-auto">
                          <div className="flex justify-between sm:justify-start sm:gap-4 text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{formatPrice(order.subtotal)}</span>
                          </div>
                          {order.shippingCost > 0 && (
                            <div className="flex justify-between sm:justify-start sm:gap-4 text-sm">
                              <span className="text-muted-foreground">Shipping</span>
                              <span>{formatPrice(order.shippingCost)}</span>
                            </div>
                          )}
                          {order.stitchingFee && order.stitchingFee > 0 ? (
                            <div className="flex justify-between sm:justify-start sm:gap-4 text-sm">
                              <span className="text-muted-foreground">Stitching Fee</span>
                              <span className="text-amber-600 font-medium">{formatPrice(order.stitchingFee)}</span>
                            </div>
                          ) : null}
                          {order.discountAmount && order.discountAmount > 0 ? (
                            <div className="flex justify-between sm:justify-start sm:gap-4 text-sm text-emerald-600">
                              <span>Discount</span>
                              <span>-{formatPrice(order.discountAmount)}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between sm:justify-start sm:gap-4 font-semibold text-base pt-1">
                            <span>Total</span>
                            <span>{formatPrice(order.total)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          {/* WhatsApp button hidden */}
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/order-status/${order.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </Button>
                          {order.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => {
                                setCancelOrder(order);
                                setCancelReason("Changed my mind");
                                setCancelDialogOpen(true);
                              }}
                            >
                              Cancel Order
                            </Button>
                          )}
                           {order.status === "delivered" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setSelectedItems(new Set(order.items.map((i) => i.id)));
                                setReturnDialogOpen(true);
                              }}
                            >
                              <RefreshCcw className="h-4 w-4 mr-2" />
                              Return / Exchange
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Return Request Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Return / Exchange</DialogTitle>
            <DialogDescription>
              Order {selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Select Items</p>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => {
                          const next = new Set(selectedItems);
                          if (checked) next.add(item.id);
                          else next.delete(item.id);
                          setSelectedItems(next);
                        }}
                      />
                      <div className="relative h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
                        <Image src={item.image} alt={item.name} fill className="object-cover" sizes="40px" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPrice(item.price)} × {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Type</p>
                  <Select value={returnType} onValueChange={(v) => setReturnType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REFUND">Refund</SelectItem>
                      <SelectItem value="EXCHANGE">Exchange</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Reason</p>
                  <Select value={returnReason} onValueChange={setReturnReason}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIZE">Wrong Size</SelectItem>
                      <SelectItem value="QUALITY">Quality Issue</SelectItem>
                      <SelectItem value="WRONG_ITEM">Wrong Item</SelectItem>
                      <SelectItem value="DAMAGED">Damaged</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Notes (optional)</p>
                <Textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Tell us more about the issue..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReturnDialogOpen(false)}
              disabled={returnSubmitting}
            >
              Cancel
            </Button>
            <Button
              disabled={selectedItems.size === 0 || returnSubmitting}
              onClick={async () => {
                if (!selectedOrder) return;
                setReturnSubmitting(true);
                try {
                  const res = await fetch("/api/returns", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      orderId: selectedOrder.id,
                      type: returnType,
                      reason: returnReason,
                      notes: returnNotes,
                      items: Array.from(selectedItems).map((orderItemId) => ({
                        orderItemId,
                        quantity: 1,
                      })),
                    }),
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || "Failed to submit request");
                  }
                  toast({
                    title: "Request submitted",
                    description: "Your return/exchange request has been received.",
                  });
                  setReturnDialogOpen(false);
                  // Refresh returns list
                  const updated = await fetch("/api/returns/user").then((r) => r.json());
                  setReturnRequests(updated || []);
                } catch (err) {
                  toast({
                    title: "Error",
                    description: err instanceof Error ? err.message : "Failed to submit request",
                    variant: "destructive",
                  });
                } finally {
                  setReturnSubmitting(false);
                }
              }}
            >
              {returnSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4 mr-2" />
              )}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel order {cancelOrder?.orderNumber}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-medium mb-2">Reason for cancellation</p>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Changed my mind">Changed my mind</SelectItem>
                  <SelectItem value="Ordered by mistake">Ordered by mistake</SelectItem>
                  <SelectItem value="Found a better price">Found a better price</SelectItem>
                  <SelectItem value="Delivery time too long">Delivery time too long</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelling}
            >
              No, Keep Order
            </Button>
            <Button
              variant="destructive"
              disabled={cancelling}
              onClick={async () => {
                if (!cancelOrder) return;
                setCancelling(true);
                try {
                  const res = await fetch(`/api/orders/${cancelOrder.id}/cancel`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reason: cancelReason }),
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || "Failed to cancel order");
                  }
                  toast({
                    title: "Order Cancelled",
                    description: `Order ${cancelOrder.orderNumber} has been successfully cancelled.`,
                  });
                  setCancelDialogOpen(false);
                  
                  // Re-fetch orders to update the UI
                  const ordersRes = await fetch("/api/orders/user");
                  if (ordersRes.ok) {
                    const data = await ordersRes.json();
                    setOrders(data);
                  }
                } catch (err) {
                  toast({
                    title: "Error",
                    description: err instanceof Error ? err.message : "Failed to cancel order",
                    variant: "destructive",
                  });
                } finally {
                  setCancelling(false);
                }
              }}
            >
              {cancelling ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Yes, Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </>
  );
}
