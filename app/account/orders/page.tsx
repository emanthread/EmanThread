"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Package, Truck, CheckCircle, Clock, Eye, RefreshCcw, Loader2, MessageCircle } from "lucide-react";
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
  total: number;
  items: {
    id: string;
    name: string;
    image: string;
    quantity: number;
    price: number;
  }[];
}

const mockOrders: Order[] = [
  {
    id: "1",
    orderNumber: "ET-2024-001234",
    date: "2024-01-15",
    status: "delivered",
    total: 9800,
    items: [
      {
        id: "1",
        name: "Royal Ivory Premium Wash & Wear",
        image: "https://images.unsplash.com/photo-1612423284241-c1f9f2dd0cd1?w=200&h=200&fit=crop",
        quantity: 1,
        price: 4500,
      },
      {
        id: "2",
        name: "Midnight Black Cotton Suit",
        image: "https://images.unsplash.com/photo-1528460033278-a6ba57020470?w=200&h=200&fit=crop",
        quantity: 1,
        price: 3800,
      },
    ],
  },
  {
    id: "2",
    orderNumber: "ET-2024-001235",
    date: "2024-01-18",
    status: "shipped",
    total: 7500,
    items: [
      {
        id: "3",
        name: "Champagne Boski Silk Blend",
        image: "https://images.unsplash.com/photo-1605902394595-f14d8ff2bc3b?w=200&h=200&fit=crop",
        quantity: 1,
        price: 7500,
      },
    ],
  },
  {
    id: "3",
    orderNumber: "ET-2024-001236",
    date: "2024-01-20",
    status: "processing",
    total: 6200,
    items: [
      {
        id: "4",
        name: "Charcoal Grey Wool Blend",
        image: "https://images.unsplash.com/photo-1574738596662-7f28ed5dd75c?w=200&h=200&fit=crop",
        quantity: 1,
        price: 6200,
      },
    ],
  },
];

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
            {filteredOrders.length === 0 ? (
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
                const StatusIcon = statusConfig[order.status].icon;
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

                      {/* Order Total & Actions */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div>
                          <p className="text-sm text-muted-foreground">Total</p>
                          <p className="text-lg font-semibold">{formatPrice(order.total)}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          {/* WhatsApp button hidden */}
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/order-status/${order.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </Button>
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
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
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

      <Footer />
    </>
  );
}
