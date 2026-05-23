"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

function ConfirmOrderContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const email = searchParams.get("email");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError("No order ID provided");
      setLoading(false);
      return;
    }

    fetch(`/api/orders/${orderId}${email ? `?email=${encodeURIComponent(email)}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setOrder(data);
        }
      })
      .catch(() => setError("Failed to load order"))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleConfirm = () => {
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen pt-20">
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-red-500 mb-4">{error || "Order not found"}</p>
          <Button asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ── Success state after confirmation ──
  if (submitted) {
    return (
      <div className="min-h-screen pt-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="bg-emerald-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-semibold mb-4">Order Placed Successfully!</h1>
          <p className="text-muted-foreground mb-2">Your order has been placed successfully.</p>
          <p className="text-muted-foreground mb-8">Order confirmation has been sent to your email.</p>
          <div className="bg-secondary/50 rounded-lg p-6 mb-8">
            <p className="text-sm text-muted-foreground mb-2">Order Number</p>
            <p className="text-2xl font-mono font-semibold">{order.orderNumber}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link href="/shop">Continue Shopping</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Confirmation state ──
  return (
    <div className="min-h-screen pt-20 bg-secondary/30">
      <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center space-y-6 bg-background rounded-xl p-8 shadow-sm border">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Review Your Order</h1>
            <p className="text-muted-foreground mt-1">
              Please confirm your order details before we proceed.
            </p>
          </div>

          {/* Order Summary */}
          <div className="border rounded-lg p-4 text-left space-y-2">
            <p><span className="font-medium">Order #:</span> {order.orderNumber}</p>
            <p><span className="font-medium">Total:</span> PKR {Number(order.grandTotal || order.total).toLocaleString()}</p>
            <p><span className="font-medium">Payment:</span> Cash on Delivery</p>
            <p className="text-sm text-muted-foreground">
              Pay PKR {Number(order.grandTotal || order.total).toLocaleString()} to the delivery person upon receipt.
            </p>
          </div>

          {/* Confirmation checkbox */}
          <div className="border rounded-lg p-4 bg-amber-50 dark:bg-amber-950/20 text-left">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm">
                I confirm my order details are correct and I will pay{' '}
                <strong>PKR {Number(order.grandTotal || order.total).toLocaleString()}</strong> in cash upon delivery.
              </span>
            </label>
          </div>

          <Button
            disabled={!confirmed}
            onClick={handleConfirm}
            className="w-full"
            size="lg"
          >
            Confirm & Place Order
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmOrderPage() {
  return (
    <>
      <Header />
      <Suspense fallback={
        <div className="min-h-screen pt-20 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <ConfirmOrderContent />
      </Suspense>
      <Footer />
    </>
  );
}