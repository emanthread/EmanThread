"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { formatPrice } from "@/lib/data";
import {
  CheckCircle,
  Lock,
  Clock,
  ChevronLeft,
  FileText,
  Building2,
  Landmark,
  X,
} from "lucide-react";

const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function PaymentConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId");
  const email = searchParams.get("email");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [codConfirmed, setCodConfirmed] = useState(false);

  // Payment confirmation fields
  const [transactionId, setTransactionId] = useState("");
  const [senderName, setSenderName] = useState("");
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [screenshotUploading, setScreenshotUploading] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);

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

  const isCOD = order?.paymentMethod === "COD";
  const isOnlinePayment = !isCOD && order?.paymentMethod;

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Clear previous error state immediately
    setScreenshotError(null);
    
    // Reset input value so the same file can trigger onChange again
    e.target.value = '';
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];
    
    if (!ALLOWED_TYPES.includes(file.type) && !allowedExts.includes(ext || '')) {
      setScreenshotError('Only JPEG, PNG, PDF, DOC, DOCX files are allowed');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setScreenshotError('File size must be under 10MB');
      return;
    }
    uploadScreenshot(file);
  };

  const uploadScreenshot = async (file: File) => {
    setScreenshotUploading(true);
    setScreenshotError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tags[]", "payment-screenshot");
      
      const res = await fetch("/api/upload/payment-screenshot", { method: "POST", body: formData });
      const data = await res.json();
      
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to upload screenshot");
      }
      setPaymentScreenshot(data.url);
    } catch (err) {
      setScreenshotError(err instanceof Error ? err.message : "Failed to upload. Please try again.");
    } finally {
      setScreenshotUploading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!transactionId.trim()) {
      alert("Please enter your transaction ID");
      return;
    }
    if (!senderName.trim()) {
      alert("Please enter the sender account name");
      return;
    }
    if (!paymentScreenshot) {
      setScreenshotError("Payment screenshot is REQUIRED. Please upload your payment proof.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/payments/manual/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          paymentMethod: order?.paymentMethod?.toUpperCase() || "NAYAPAY",
          transactionId: transactionId.trim(),
          senderName: senderName.trim(),
          screenshotUrl: paymentScreenshot || undefined,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to submit payment. Please try again.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
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

  // Submitted state (for online payments)
  if (submitted) {
    return (
      <div className="min-h-screen pt-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-8">
            <div className="bg-emerald-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-semibold mb-2">Payment Submitted!</h1>
            <p className="text-muted-foreground">
              Your payment proof has been received for order #{order.orderNumber}
            </p>
          </div>

          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">⏱️ Payment Verification Pending</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Your payment will be verified within 1-2 hours. You'll receive an email confirmation once approved.
                    </p>
                  </div>
                </div>
              </div>

              <h3 className="font-medium mb-3">Payment Details Submitted</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="font-medium">{order.paymentMethod === "NAYAPAY" ? "Nayapay" : order.paymentMethod === "MEEZAN_BANK" ? "Meezan Bank" : order.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono font-medium">{transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{Number(order.stitchingFee) > 0 ? formatPrice(Number(order.subtotal) - Number(order.discountAmount || 0)) : formatPrice(Number(order.grandTotal))}</span>
                </div>
              </div>
            </CardContent>
          </Card>

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

  // ─── COD VIEW ──────────────────────────────────────────────────────
  if (isCOD) {
    return (
      <div className="min-h-screen pt-20 bg-secondary/30">
        <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center space-y-6 bg-background rounded-xl p-8 shadow-sm border">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Order Confirmed!</h1>
              <p className="text-muted-foreground mt-1">
                Your Cash on Delivery order has been placed successfully.
              </p>
            </div>
            
            {/* Order Summary */}
            <div className="border rounded-lg p-4 text-left space-y-2">
              <p><span className="font-medium">Order #:</span> {order.orderNumber}</p>
              <p><span className="font-medium">Total:</span> PKR {Number(order.grandTotal).toLocaleString()}</p>
              <p><span className="font-medium">Payment:</span> Cash on Delivery</p>
              <p className="text-sm text-muted-foreground">
                Pay PKR {Number(order.grandTotal).toLocaleString()} to the delivery person upon receipt.
              </p>
            </div>

            {/* Confirmation checkbox */}
            <div className="border rounded-lg p-4 bg-amber-50 dark:bg-amber-950/20 text-left">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={codConfirmed}
                  onChange={e => setCodConfirmed(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm">
                  I confirm my order details are correct and I will pay{' '}
                  <strong>PKR {Number(order.grandTotal).toLocaleString()}</strong> in cash upon delivery.
                </span>
              </label>
            </div>

            <Button
              disabled={!codConfirmed}
              onClick={() => router.push(`/order-status/${order.id}`)}
              className="w-full"
              size="lg"
            >
              Confirm & Track Order
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── ONLINE PAYMENT VIEW (Nayapay / Meezan Bank) ──────────────────
  const paymentMethod = order.paymentMethod?.toLowerCase() || "nayapay";

  return (
    <div className="min-h-screen pt-20 bg-secondary/30">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link
          href="/checkout"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Checkout
        </Link>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left: Invoice + Contact Info */}
          <div className="lg:col-span-3 space-y-6">
            {/* Invoice Summary */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    Invoice
                  </CardTitle>
                  <Badge variant="outline" className="font-mono">{order.orderNumber}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    {order.items?.map((item: any, i: number) => {
                      let imageUrl = "/placeholder.jpg";
                      try {
                        const parsed = typeof item.product?.images === "string" ? JSON.parse(item.product.images) : item.product?.images;
                        if (Array.isArray(parsed) && parsed.length > 0) imageUrl = parsed[0];
                      } catch (e) {}
                      return (
                      <div key={i} className="flex gap-3 pb-3 border-b border-border last:border-0">
                        <div className="relative w-12 h-14 bg-secondary rounded overflow-hidden shrink-0">
                          <Image
                            src={imageUrl}
                            alt={item.product?.name || "Product"}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.product?.name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-medium shrink-0">
                          {formatPrice(Number(item.priceAtTimeOfPurchase) * item.quantity)}
                        </p>
                      </div>
                      );
                    })}
                  </div>

                  <div className="space-y-1.5 text-sm pt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(Number(order.subtotal))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>{Number(order.shippingCost) === 0 ? "Free" : formatPrice(Number(order.shippingCost))}</span>
                    </div>
                    {Number(order.discountAmount) > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount</span>
                        <span>-{formatPrice(Number(order.discountAmount))}</span>
                      </div>
                    )}
                    {Number(order.stitchingFee) > 0 ? (
                      <>
                        <div className="flex justify-between font-semibold text-base pt-2 border-t border-border text-amber-600">
                          <span>Paid Online</span>
                          <span>{formatPrice(Number(order.subtotal) - Number(order.discountAmount || 0))}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-base text-muted-foreground">
                          <span>Due on Delivery</span>
                          <span>{formatPrice(Number(order.shippingCost) + Number(order.stitchingFee))}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between font-semibold text-base pt-2 border-t border-border">
                        <span>Total</span>
                        <span>{formatPrice(Number(order.grandTotal))}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right: Payment Confirmation */}
          <div className="lg:col-span-2">
            <div className="sticky top-28 space-y-6">
              {/* Payment Method Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    {paymentMethod === "nayapay" ? (
                      <Building2 className="h-5 w-5" />
                    ) : (
                      <Landmark className="h-5 w-5" />
                    )}
                    Pay via {paymentMethod === "nayapay" ? "Nayapay" : "Meezan Bank"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {paymentMethod === "nayapay" ? (
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg space-y-1">
                      <p className="font-medium text-foreground">Transfer to:</p>
                      <p>📱 NayaPay ID: <span className="font-mono font-semibold">{FEATURE_FLAGS.NAYAPAY_ACCOUNT_NUMBER}</span></p>
                      <p>👤 Name: <span className="font-semibold">{FEATURE_FLAGS.NAYAPAY_ACCOUNT_NAME}</span></p>
                      <p>📞 Mobile: <span className="font-semibold">{FEATURE_FLAGS.NAYAPAY_PHONE}</span></p>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg space-y-1">
                      <p className="font-medium text-foreground">Transfer to:</p>
                      <p>🏦 Account #: <span className="font-mono font-semibold">{FEATURE_FLAGS.MEEZAN_ACCOUNT_NUMBER}</span></p>
                      <p>🏦 IBAN: <span className="font-mono font-semibold">{FEATURE_FLAGS.MEEZAN_IBAN}</span></p>
                      <p>👤 Name: <span className="font-semibold">{FEATURE_FLAGS.MEEZAN_ACCOUNT_NAME}</span></p>
                    </div>
                  )}
                  {Number(order.stitchingFee) > 0 ? (
                    <>
                      <p className="text-sm font-medium text-amber-600">
                        Pay now: PKR {(Number(order.subtotal) - Number(order.discountAmount || 0)).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Due on delivery: PKR {(Number(order.shippingCost) + Number(order.stitchingFee)).toLocaleString()} (shipping + stitching)
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Send the upfront amount and enter the transaction details below.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Send PKR {Number(order.grandTotal).toLocaleString()} and enter the transaction details below.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Payment Confirmation Form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Payment Confirmation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">
                      Transaction ID / Reference Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. TXN123456789"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">
                      Sender Account Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Name registered on your account"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary outline-none"
                      required
                    />
                  </div>

                  {/* Screenshot Upload — REQUIRED */}
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">
                      Payment Screenshot <span className="text-red-500">* Required</span>
                    </label>
                    <div className={`border-2 border-dashed rounded-lg p-4 ${
                      screenshotError ? 'border-red-500 bg-red-50' : 
                      paymentScreenshot ? 'border-green-500 bg-green-50' : 
                      'border-amber-400 bg-amber-50'
                    }`}>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                        onChange={handleScreenshotChange}
                        className="w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground file:text-xs cursor-pointer"
                      />
                      {screenshotUploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
                      {screenshotError && (
                        <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                          <X className="h-3 w-3" /> {screenshotError}
                        </p>
                      )}
                      {paymentScreenshot && (
                        <p className="text-green-600 text-xs mt-2">✓ Screenshot uploaded successfully</p>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-800 dark:text-amber-200">
                        Your order will be confirmed within 1-2 hours after payment verification by our team.
                        You'll receive an email confirmation once approved.
                      </p>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleConfirmPayment}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Submitting...
                      </span>
                    ) : Number(order.stitchingFee) > 0 ? (
                      `Confirm Order - ${formatPrice(Number(order.subtotal) - Number(order.discountAmount || 0))}`
                    ) : (
                      `Confirm Order - ${formatPrice(Number(order.grandTotal))}`
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                    <Lock className="h-3 w-3" />
                    Your payment information is secure
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentConfirmationPage() {
  return (
    <>
      <Header />
      <Suspense fallback={
        <div className="min-h-screen pt-20 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <PaymentConfirmationContent />
      </Suspense>
      <Footer />
    </>
  );
}