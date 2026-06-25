"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { getProductImage } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  CreditCard,
  Banknote,
  Smartphone,
  Lock,
  CheckCircle,
  MessageCircle,
  Building2,
  Landmark,
} from "lucide-react";

interface PaymentDetails {
  nayapayAccount: string;
  nayapayName: string;
  nayapayPhone: string;
  meezanIban: string;
  meezanAccountName: string;
  meezanBranch: string;
  meezanAccountNumber: string;
}
import { useAuthStore } from "@/lib/auth-store";
import { FEATURE_FLAGS, DEFAULT_STITCHING_FEE } from "@/lib/feature-flags";

const paymentMethods = [
  { id: "cod", name: "Cash on Delivery", description: "Pay when you receive your order", icon: Banknote },
  { id: "jazzcash", name: "JazzCash", description: "Pay using JazzCash mobile wallet", icon: Smartphone },
  { id: "easypaisa", name: "Easypaisa", description: "Pay using Easypaisa mobile wallet", icon: Smartphone },
  { id: "card", name: "Credit/Debit Card", description: "Pay securely with your card", icon: CreditCard },
  { id: "safepay", name: "Safepay", description: "Pay securely via Safepay — cards, wallets & more", icon: Lock },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, getStitchingTotal, hasStitching, clearCart, updateStitching } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const totalPrice = getTotalPrice();

  // Item-level selection — all items selected by default
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(items.map((i) => i.product.id)));
  const selectedItems = items.filter((i) => selectedIds.has(i.product.id));
  const selectedTotal = selectedItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const stitchingTotal = selectedItems.reduce(
    (sum, item) => sum + (item.stitchingProfileId && item.stitchingProfileId !== "none" ? (item.stitchingPrice ?? DEFAULT_STITCHING_FEE) * item.quantity : 0),
    0
  );
  const hasStitchingSelected = selectedItems.some(
    (item) => item.stitchingProfileId != null && item.stitchingProfileId !== "none"
  );
  const outOfStockItems = items.filter(
    (item) => !item.product.inStock || (item.product.stockQuantity !== undefined && item.product.stockQuantity <= 0)
  );
  const hasOutOfStock = outOfStockItems.length > 0;

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const [submitError, setSubmitError] = useState("");
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<number | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Payment account details — fetched server-side, never in the client bundle
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);

  useEffect(() => {
    fetch("/api/store/payment-details")
      .then((r) => r.json())
      .then((data) => { if (!data.error) setPaymentDetails(data); })
      .catch((error) => {
        console.error("[CHECKOUT_FETCH_ERROR]", error);
      }); // UI shows fallback if null
  }, []);
  const [couponLoading, setCouponLoading] = useState(false);
  const [stitchingPriceMap, setStitchingPriceMap] = useState<Record<string, number>>({});
  const [transactionId, setTransactionId] = useState('');
  const [saveAddress, setSaveAddress] = useState(false);
  const [measurementProfiles, setMeasurementProfiles] = useState<Array<{ id: string; profileName: string; garmentType: string; isDefault: boolean; shalwar1?: string; ladSimpleShalwar1?: string; ladShalwarBelt1?: string; trouserdata1?: string }>>([]);
  // Per-item shalwar variant selection for items where the profile is a shalwar kameez type.
  // Key: productId, Value: stitching price DB key for the chosen variant.
  const [itemShalwarVariants, setItemShalwarVariants] = useState<Record<string, string>>({});

  // Maps a measurement profile garmentType → StitchingPrice.fabricType key in DB.
  // Also used to determine which garment types need a variant selector.
  const garmentTypeToPriceKey = (garmentType: string, variant?: string): string => {
    const map: Record<string, string> = {
      // Male profiles
      male_shalwar_kameez:   variant ?? "shalwar_kameez_simple_shalwar",
      male_simple_3_piece:   "simple 3 piece suit",
      male_prince_coat:      "prince coat 3 piece suit",
      male_shirt:            "shirt",
      // Female profiles
      female_simple_shalwar: variant ?? "female_shalwar_kameez_simple_shalwar",
      female_frock:          "frock",
      female_lehnga_kurti:   "lehnga kurti",
      female_saari:          "saari",
    };
    return map[garmentType] ?? garmentType;
  };

  // Variant options shown beneath the profile selector for shalwar kameez profiles.
  const shalwarVariantOptions = {
    male_shalwar_kameez: [
      { key: "shalwar_kameez_simple_shalwar", label: "With Simple Shalwar" },
      { key: "shalwar_kameez_trouser",        label: "With Trouser" },
    ],
    female_simple_shalwar: [
      { key: "female_shalwar_kameez_simple_shalwar", label: "With Simple Shalwar" },
      { key: "female_shalwar_kameez_trouser",        label: "With Trouser" },
      { key: "female_shalwar_kameez_belt_shalwar",   label: "With Belt Shalwar" },
    ],
  } as Record<string, { key: string; label: string }[]>;

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    address: "", city: "", province: "", postalCode: "", notes: "",
  });

  const [shippingCost, setShippingCost] = useState(200);
  const [estimatedDays, setEstimatedDays] = useState("3-5 business days");
  const [zoneName, setZoneName] = useState("");

  const [freeShippingThreshold, setFreeShippingThreshold] = useState(5000);

  useEffect(() => {
    fetch("/api/store/public")
      .then((r) => r.ok ? r.json() : Promise.resolve(null))
      .then((data) => {
        if (data?.freeShippingThreshold) setFreeShippingThreshold(data.freeShippingThreshold);
      })
      .catch((error) => {
        console.error("[CHECKOUT_FETCH_ERROR]", error);
      }); // fallback to 5000 default
  }, []);
  const grandTotal = selectedTotal + shippingCost + stitchingTotal - (appliedDiscount || 0);
  // When stitching is selected:
  //   Pay now (bank transfer): selectedTotal - discount (fabric only)
  //   Pay on delivery (COD cash): shippingCost + stitchingTotal
  const upfrontAmount = hasStitchingSelected
    ? selectedTotal - (appliedDiscount || 0)  // fabric - discount paid now
    : grandTotal;                               // everything paid now (no stitching)
  const dueOnDelivery = hasStitchingSelected
    ? shippingCost + stitchingTotal             // shipping + stitching on delivery
    : 0;                                        // nothing on delivery (no stitching)

  // Sync selectedIds when items change
  useEffect(() => {
    setSelectedIds(new Set(items.map((i) => i.product.id)));
  }, [items]);

  // Fetch stitching prices & measurement profiles
  useEffect(() => {
    fetch("/api/stitching-prices")
      .then((r) => r.json())
      .then((data) => {
        // The API returns { male: { "shalwar kameez": 2500, ... }, female: { ... } }
        // Flatten into a single Record<string, number> for direct lookup by fabric type
        if (data && typeof data === "object") {
          const flat: Record<string, number> = {};
          if (data.male && typeof data.male === "object") Object.assign(flat, data.male);
          if (data.female && typeof data.female === "object") Object.assign(flat, data.female);
          setStitchingPriceMap(flat);
        }
      })
      .catch((error) => {
        console.error("[CHECKOUT_FETCH_ERROR]", error);
      });
    if (isAuthenticated) {
      fetch("/api/measurements")
        .then((r) => r.json())
        .then((data) => {
          if (data?.profiles) {
            const profiles = data.profiles.map((p: any) => ({
              id: p.id,
              profileName: p.profileName,
              garmentType: p.garmentType,
              isDefault: p.isDefault,
              shalwar1: p.shalwar1,
              ladSimpleShalwar1: p.ladSimpleShalwar1,
              ladShalwarBelt1: p.ladShalwarBelt1,
              trouserdata1: p.trouserdata1,
            }));
            setMeasurementProfiles(profiles);

            // Auto-select default profile for all stitching items
            const defaultProfile = profiles.find((p: { isDefault: boolean }) => p.isDefault);
            if (defaultProfile) {
              items.forEach((item) => {
                const hasStitching = item.stitchingProfileId != null && item.stitchingProfileId !== "none";
                if (!hasStitching) {
                  // Use the profile's garmentType to look up the correct stitching price,
                  // falling back to DEFAULT_STITCHING_FEE if no matching price is configured.
                  const priceKey = garmentTypeToPriceKey(defaultProfile.garmentType);
                  const price = stitchingPriceMap[priceKey] ?? DEFAULT_STITCHING_FEE;
                  updateStitching(item.product.id, {
                    price,
                    profileId: defaultProfile.id,
                    profileName: defaultProfile.profileName,
                  });
                }
              });
            }
          }
        })
        .catch((error) => {
          console.error("[CHECKOUT_FETCH_ERROR]", error);
        });
    }
  }, [isAuthenticated]);

  // When stitching is selected, COD is not valid — switch to nayapay or meezan_bank
  useEffect(() => {
    if (hasStitchingSelected && paymentMethod === "cod") {
      setPaymentMethod(FEATURE_FLAGS.MANUAL_PAYMENT_MODE ? "nayapay" : "jazzcash");
    }
  }, [hasStitchingSelected, paymentMethod]);

  // Pre-fill form from user profile and default address
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const nameParts = (user.name ?? "").split(" ");
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ");

    const defaultAddr = user.addresses?.find((a) => a.isDefault);

    setFormData((prev) => ({
      ...prev,
      firstName: prev.firstName || firstName,
      lastName: prev.lastName || lastName,
      email: prev.email || user.email || "",
      phone: prev.phone || user.phone || "",
      address: prev.address || defaultAddr?.address || "",
      city: prev.city || defaultAddr?.city || "",
      province: prev.province || defaultAddr?.province || "",
      postalCode: prev.postalCode || defaultAddr?.postalCode || "",
    }));
  }, [isAuthenticated, user]);

  // Debounced shipping zone lookup
  useEffect(() => {
    if (!formData.city.trim() || !formData.province.trim()) return;
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/shipping/zone?city=${encodeURIComponent(formData.city)}&province=${encodeURIComponent(formData.province)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.zone) {
          const rate = selectedTotal >= freeShippingThreshold ? 0 : data.zone.shippingRate;
          setShippingCost(rate);
          setEstimatedDays(data.zone.estimatedDays);
          setZoneName(data.zone.name);
        }
      } catch (err) { console.error("Failed to fetch shipping zone:", err); }
    }, 500);
    return () => clearTimeout(timeout);
  }, [formData.city, formData.province, selectedTotal, freeShippingThreshold]);

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      setSubmitError("Please select at least one item to checkout");
      return;
    }
    setIsSubmitting(true);
    setSubmitError("");

    // Guard: COD cannot be used with stitching service
    if (hasStitchingSelected && paymentMethod === "cod") {
      setSubmitError("Cash on Delivery is not available when stitching is selected. Please choose Nayapay or Meezan Bank.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        items: selectedItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
          stitchingProfileId: item.stitchingProfileId && item.stitchingProfileId !== "none" ? item.stitchingProfileId : undefined,
          measurementProfileId: item.stitchingProfileId && item.stitchingProfileId !== "none" ? item.stitchingProfileId : undefined,
        })),
        shippingAddress: {
          firstName: formData.firstName, lastName: formData.lastName,
          email: formData.email, phone: formData.phone,
          address: formData.address, city: formData.city,
          province: formData.province, postalCode: formData.postalCode,
        },
        paymentMethod: paymentMethod.toUpperCase(),
        notes: formData.notes,
        whatsappConsent,
        couponCode: appliedDiscount && appliedDiscount > 0 ? couponCode : undefined,
      };

      // Include stitching data if any item has stitching selected
      if (hasStitchingSelected) {
        payload.stitchingFee = stitchingTotal;
        payload.stitchingItems = selectedItems
          .filter((item) => item.stitchingProfileId != null && item.stitchingProfileId !== "none")
          .map((item) => ({
            productId: item.product.id,
            fabricType: item.product.fabricType,
            stitchingPrice: item.stitchingPrice ?? DEFAULT_STITCHING_FEE,
          }));
      }

      // Include measurement information for stitching items (server-side attachment)
      const itemsToAttach = selectedItems
        .filter((item) => item.stitchingProfileId != null && item.stitchingProfileId !== "none")
        .map((item) => ({ productId: item.product.id, productName: item.product.name }));
      if (itemsToAttach.length > 0) {
        payload.measurementItems = itemsToAttach;
      }

      const orderRes = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        setSubmitError(orderData.error || "Failed to place order. Please try again.");
        setIsSubmitting(false);
        return;
      }

      if (FEATURE_FLAGS.MANUAL_PAYMENT_MODE && (paymentMethod === "nayapay" || paymentMethod === "meezan_bank")) {
        clearCart();
        setIsSubmitting(false);
        router.push(`/payment-confirmation?orderId=${orderData.id}&email=${encodeURIComponent(formData.email)}`);
        return;
      }

      // Save address to profile if checkbox is checked
      if (isAuthenticated && saveAddress && formData.address) {
        const defaultAddr = user?.addresses?.find((a) => a.isDefault);
        const addressPayload = {
          label: "home",
          fullName: `${formData.firstName} ${formData.lastName}`.trim(),
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          province: formData.province,
          postalCode: formData.postalCode,
          isDefault: !defaultAddr,
        };
        if (defaultAddr) {
          fetch(`/api/user/addresses/${defaultAddr.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(addressPayload),
          }).catch((error) => {
            console.error("[CHECKOUT_FETCH_ERROR]", error);
          });
        } else {
          fetch("/api/user/addresses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(addressPayload),
          }).catch((error) => {
            console.error("[CHECKOUT_FETCH_ERROR]", error);
          });
        }
      }

      if (paymentMethod === "cod") {
        clearCart();
        setIsSubmitting(false);
        router.push(`/confirm-order?orderId=${orderData.id}&email=${encodeURIComponent(formData.email)}`);
        return;
      }

      const initiateRes = await fetch("/api/payments/initiate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: orderData.id, provider: paymentMethod }) });
      const initiateData = await initiateRes.json();
      if (!initiateRes.ok || !initiateData.success) {
        setSubmitError(initiateData.error || "Payment initiation failed. Please try again.");
        setIsSubmitting(false);
        return;
      }
      window.location.href = initiateData.redirectUrl;
    } catch {
      setSubmitError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (items.length === 0 && !isComplete) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h1 className="text-2xl font-semibold mb-4">Your cart is empty</h1>
            <p className="text-muted-foreground mb-8">Add some products before checking out.</p>
            <Button asChild><Link href="/shop">Continue Shopping</Link></Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (isComplete) {
    return (
      <>
        <Header /><CartDrawer />
        <main className="min-h-screen pt-20">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
            <div className="bg-emerald-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-semibold mb-4">Order Placed Successfully!</h1>
            <p className="text-muted-foreground mb-2">Your order has been placed successfully.</p>
            <p className="text-muted-foreground mb-8">Order confirmation has been sent to your email.</p>
            <div className="bg-secondary/50 rounded-lg p-6 mb-8">
              <p className="text-sm text-muted-foreground mb-2">Order Number</p>
              <p className="text-2xl font-mono font-semibold">{orderNumber}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild><Link href="/shop">Continue Shopping</Link></Button>
              <Button variant="outline" asChild><Link href="/">Back to Home</Link></Button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header /><CartDrawer />
      <main className="min-h-screen pt-20 bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/cart" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Cart
          </Link>

          <form onSubmit={handleSubmit}>
            <div className="grid lg:grid-cols-5 gap-8">
              <div className="lg:col-span-3 space-y-8">
                {/* Contact Info */}
                <div className="bg-background rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-semibold mb-6">Contact Information</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><Label htmlFor="firstName">First Name *</Label><Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} required className="mt-1" /></div>
                    <div><Label htmlFor="lastName">Last Name *</Label><Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} required className="mt-1" /></div>
                    <div><Label htmlFor="email">Email Address *</Label><Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required className="mt-1" /></div>
                    <div><Label htmlFor="phone">Phone Number *</Label><Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} required placeholder="+92 300 1234567" className="mt-1" /></div>
                  </div>
                </div>

                {/* Shipping */}
                <div className="bg-background rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-semibold mb-6">Shipping Address</h2>
                  <div className="space-y-4">
                    <div><Label htmlFor="address">Street Address *</Label><Input id="address" name="address" value={formData.address} onChange={handleInputChange} required className="mt-1" /></div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div><Label htmlFor="city">City *</Label><Input id="city" name="city" value={formData.city} onChange={handleInputChange} required className="mt-1" /></div>
                      <div><Label htmlFor="province">Province *</Label><Input id="province" name="province" value={formData.province} onChange={handleInputChange} required className="mt-1" placeholder="e.g. Punjab, Sindh" /></div>
                    </div>
                    <div><Label htmlFor="postalCode">Postal Code</Label><Input id="postalCode" name="postalCode" value={formData.postalCode} onChange={handleInputChange} className="mt-1" /></div>
                    <div><Label htmlFor="notes">Order Notes (Optional)</Label><Textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Special instructions for delivery..." className="mt-1" rows={3} /></div>
                    {isAuthenticated && (
                      <div className="flex items-center gap-2 pt-2">
                        <Checkbox
                          id="saveAddress"
                          checked={saveAddress}
                          onCheckedChange={(checked) => setSaveAddress(checked === true)}
                        />
                        <Label htmlFor="saveAddress" className="text-sm cursor-pointer leading-tight">
                          Save this address to my profile
                        </Label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Method */}
                {FEATURE_FLAGS.MANUAL_PAYMENT_MODE ? (
                  <div className="bg-background rounded-lg p-6 shadow-sm">
                    <h2 className="text-xl font-semibold mb-6">Payment Method</h2>
                    {hasStitchingSelected && (
                      <div className="mb-4 p-3 bg-yellow-100 text-amber-900 rounded text-sm">
                        ⚡ Stitching selected: Pay fabric amount now via Nayapay/Meezan Bank. 
                        Pay stitching fee + shipping in cash on delivery.
                      </div>
                    )}
                    <div className="space-y-3">
                      {!hasStitchingSelected && (
                        <label className={cn("flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all", paymentMethod === "cod" ? "border-accent bg-accent/5" : "border-border hover:border-muted-foreground")}>
                          <input type="radio" name="pay" value="cod" checked={paymentMethod === "cod"} onChange={(e) => setPaymentMethod(e.target.value)} className="h-4 w-4" />
                          <Banknote className="h-5 w-5 text-muted-foreground" />
                          <div><p className="font-medium">Cash on Delivery</p><p className="text-sm text-muted-foreground">Pay when you receive your order</p></div>
                        </label>
                      )}
                      <label className={cn("flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors", paymentMethod === "nayapay" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                        <input type="radio" name="pay" value="nayapay" checked={paymentMethod === "nayapay"} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-muted-foreground" /><span className="font-medium text-sm">Nayapay</span><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Instant Transfer</span></div>
                          {paymentMethod === "nayapay" && <div className="mt-3 p-3 bg-muted rounded-lg text-sm space-y-1"><p className="font-medium">Transfer to:</p><p>📱 NayaPay ID: <span className="font-mono font-semibold">{paymentDetails?.nayapayAccount ?? "..."}</span></p><p>👤 Name: <span className="font-semibold">{paymentDetails?.nayapayName ?? "..."}</span></p><p>📞 Mobile: <span className="font-semibold">{paymentDetails?.nayapayPhone ?? "..."}</span></p><p className="text-xs text-muted-foreground mt-2">Send <strong>PKR {upfrontAmount.toFixed(0)}</strong> and enter the transaction ID below.{hasStitchingSelected && <span className="block text-amber-600">PKR {dueOnDelivery.toFixed(0)} (shipping + stitching) is due on delivery.</span>}</p></div>}
                        </div>
                      </label>
                      <label className={cn("flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors", paymentMethod === "meezan_bank" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                        <input type="radio" name="pay" value="meezan_bank" checked={paymentMethod === "meezan_bank"} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2"><Landmark className="h-5 w-5 text-muted-foreground" /><span className="font-medium text-sm">Meezan Bank</span><span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Bank Transfer</span></div>
                          {paymentMethod === "meezan_bank" && <div className="mt-3 p-3 bg-muted rounded-lg text-sm space-y-1"><p className="font-medium">Transfer to:</p><p>🏦 Account #: <span className="font-mono font-semibold">{paymentDetails?.meezanAccountNumber ?? "..."}</span></p><p>🏦 IBAN: <span className="font-mono font-semibold">{paymentDetails?.meezanIban ?? "..."}</span></p><p>👤 Name: <span className="font-semibold">{paymentDetails?.meezanAccountName ?? "..."}</span></p><p className="text-xs text-muted-foreground mt-2">Send <strong>PKR {upfrontAmount.toFixed(0)}</strong> and enter the transaction ID below.{hasStitchingSelected && <span className="block text-amber-600">PKR {dueOnDelivery.toFixed(0)} (shipping + stitching) is due on delivery.</span>}</p></div>}
                        </div>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="bg-background rounded-lg p-6 shadow-sm">
                    <h2 className="text-xl font-semibold mb-6">Payment Method</h2>
                    {hasStitchingSelected && (
                      <div className="mb-4 p-3 bg-yellow-100 text-amber-900 rounded text-sm">
                        ⚡ Stitching selected: Pay fabric amount now via Nayapay/Meezan Bank. 
                        Pay stitching fee + shipping in cash on delivery.
                      </div>
                    )}
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                      {paymentMethods
                        .filter((m) => !(hasStitchingSelected && m.id === "cod"))
                        .map((m) => (
                        <label key={m.id} htmlFor={m.id} className={cn("flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all", paymentMethod === m.id ? "border-accent bg-accent/5" : "border-border hover:border-muted-foreground")}>
                          <RadioGroupItem value={m.id} id={m.id} />
                          <m.icon className="h-5 w-5 text-muted-foreground" />
                          <div><p className="font-medium">{m.name}</p><p className="text-sm text-muted-foreground">{m.description}</p></div>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-2">
                <div className="sticky top-28 bg-background rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
                  <p className="text-xs text-muted-foreground mb-4">{selectedItems.length} of {items.length} items selected</p>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {items.map((item) => {
                      const isSelected = selectedIds.has(item.product.id);
                      return (
                        <div key={item.product.id} className={cn("flex items-start gap-3 pb-3 border-b border-border last:border-0 transition-opacity", !isSelected && "opacity-50")}>
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleItem(item.product.id)} className="mt-4" />
                          <div className="relative w-14 h-16 bg-secondary rounded overflow-hidden shrink-0">
                            <Image src={getProductImage(item.product.images)} alt={item.product.name} fill className="object-cover" sizes="80px" />
                            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">{item.quantity}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-1">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground">{item.product.fabricType}</p>
                            <select
                              value={item.stitchingProfileId && item.stitchingProfileId !== "none" ? item.stitchingProfileId : "none"}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "none" || val === "create_new") {
                                  if (val === "create_new") {
                                    router.push("/account/measurements");
                                    return;
                                  }
                                  // Clear variant selection too
                                  setItemShalwarVariants((prev) => { const next = { ...prev }; delete next[item.product.id]; return next; });
                                  updateStitching(item.product.id, { price: null, profileId: null, profileName: null });
                                } else {
                                  const profile = measurementProfiles.find((p) => p.id === val);
                                  // Determine correct stitching price via garmentType mapping.
                                  // If the profile is a shalwar kameez type, check if user already
                                  // selected a variant; otherwise default to simple shalwar.
                                  const currentVariant = itemShalwarVariants[item.product.id];
                                  const priceKey = garmentTypeToPriceKey(profile?.garmentType ?? "", currentVariant);
                                  const price = stitchingPriceMap[priceKey] ?? DEFAULT_STITCHING_FEE;
                                  updateStitching(item.product.id, {
                                    price,
                                    profileId: val,
                                    profileName: profile?.profileName ?? "Stitching Required"
                                  });
                                }
                              }}
                              disabled={!isAuthenticated}
                              title={!isAuthenticated ? "Login to add stitching" : undefined}
                              className="w-full text-xs border border-border rounded-md px-2 py-1 bg-background mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              <option value="none">No Stitching</option>
                              {!isAuthenticated && (
                                <option value="" disabled>Login to see saved profiles</option>
                              )}
                              {isAuthenticated && measurementProfiles.length === 0 ? (
                                <option value="" disabled>No profiles yet</option>
                              ) : (
                                measurementProfiles.map((p) => (
                                  <option key={p.id} value={p.id}>{p.profileName}</option>
                                ))
                              )}
                              <option value="create_new">+ Create New Profile</option>
                            </select>
                            {/* Shalwar variant selector — only shown when a shalwar kameez profile is active */}
                            {(() => {
                              if (!item.stitchingProfileId || item.stitchingProfileId === "none") return null;
                              const profile = measurementProfiles.find((p) => p.id === item.stitchingProfileId);
                              let variants = shalwarVariantOptions[profile?.garmentType ?? ""];
                              if (!variants || !profile) return null;

                              const hasMaleShalwar = !!profile.shalwar1;
                              const hasFemaleSimpleShalwar = !!profile.ladSimpleShalwar1;
                              const hasFemaleBeltShalwar = !!profile.ladShalwarBelt1;
                              const hasTrouser = !!profile.trouserdata1;

                              if (profile.garmentType === "male_shalwar_kameez") {
                                if (hasMaleShalwar && !hasTrouser) {
                                  variants = variants.filter((v) => v.key.includes("shalwar"));
                                } else if (hasTrouser && !hasMaleShalwar) {
                                  variants = variants.filter((v) => v.key.includes("trouser"));
                                }
                              } else if (profile.garmentType === "female_simple_shalwar") {
                                const availableVariants: string[] = [];
                                if (hasFemaleSimpleShalwar) availableVariants.push("female_shalwar_kameez_simple_shalwar");
                                if (hasFemaleBeltShalwar) availableVariants.push("female_shalwar_kameez_belt_shalwar");
                                if (hasTrouser) availableVariants.push("female_shalwar_kameez_trouser");

                                if (availableVariants.length > 0) {
                                  variants = variants.filter((v) => availableVariants.includes(v.key));
                                }
                              }

                              // Ensure selected variant is valid
                              let selectedVariant = itemShalwarVariants[item.product.id];
                              if (!selectedVariant || !variants.find((v) => v.key === selectedVariant)) {
                                selectedVariant = variants[0].key;
                                // Need to trigger update, but we are rendering. 
                                // It will update on next interaction, but we should default to visual match.
                              }
                              return (
                                <select
                                  value={selectedVariant}
                                  onChange={(e) => {
                                    const variantKey = e.target.value;
                                    setItemShalwarVariants((prev) => ({ ...prev, [item.product.id]: variantKey }));
                                    // Update stitching price immediately based on new variant
                                    const newPrice = stitchingPriceMap[variantKey] ?? DEFAULT_STITCHING_FEE;
                                    updateStitching(item.product.id, {
                                      price: newPrice,
                                      profileId: item.stitchingProfileId!,
                                      profileName: item.stitchingProfileName ?? "Stitching Required",
                                    });
                                  }}
                                  className="w-full text-xs border border-primary/40 rounded-md px-2 py-1 bg-primary/5 mt-1 text-primary font-medium"
                                >
                                  {variants.map((v) => (
                                    <option key={v.key} value={v.key}>{v.label}</option>
                                  ))}
                                </select>
                              );
                            })()}
                          </div>
                          <p className="text-sm font-medium shrink-0">{formatPrice(item.product.price * item.quantity)}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border mt-4">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(selectedTotal)}</span></div>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input placeholder="Coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} disabled={couponLoading} className="flex-1" />
                        <Button type="button" variant="outline" disabled={!couponCode.trim() || couponLoading} onClick={async () => {
                          setCouponLoading(true); setCouponError(null);
                          try {
                            const res = await fetch("/api/cart/apply-discount", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ couponCode, cartItems: selectedItems.map((i) => ({ productId: i.product.id, quantity: i.quantity, price: i.product.price })) }) });
                            if (res.ok) { const d = await res.json(); setAppliedDiscount(d.discountAmount); } else { const e = await res.json(); setCouponError(e.error || "Invalid code"); setAppliedDiscount(null); }
                          } catch { setCouponError("Failed to apply coupon"); setAppliedDiscount(null); } finally { setCouponLoading(false); }
                        }}>{couponLoading ? "..." : "Apply"}</Button>
                      </div>
                      {couponError && <p className="text-xs text-red-500">{couponError}</p>}
                      {appliedDiscount !== null && appliedDiscount > 0 && <p className="text-xs text-emerald-600">Coupon applied!</p>}
                    </div>

                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Shipping</span><span>{shippingCost === 0 ? "Free" : formatPrice(shippingCost)}</span></div>
                    {hasStitchingSelected && stitchingTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Stitching Fee</span>
                        <span>{formatPrice(stitchingTotal)}</span>
                      </div>
                    )}
                    {appliedDiscount !== null && appliedDiscount > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>Discount</span><span>-{formatPrice(appliedDiscount)}</span></div>}
                    {zoneName && <div className="flex justify-between text-xs text-muted-foreground"><span>Delivery to {zoneName}</span><span>{estimatedDays}</span></div>}
                    {hasStitchingSelected ? (
                      <>
                        <div className="flex justify-between font-semibold text-base pt-3 border-t border-border text-amber-600">
                          <span>Pay Now via Bank Transfer</span>
                          <span>{formatPrice(upfrontAmount)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-base text-muted-foreground">
                          <span>Due on Delivery</span>
                          <span>{formatPrice(dueOnDelivery)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between font-semibold text-lg pt-3 border-t border-border">
                        <span>Total</span>
                        <span>{formatPrice(grandTotal)}</span>
                      </div>
                    )}
                  </div>

                  {submitError && <p className="text-sm text-red-500 mt-2">{submitError}</p>}

                  {hasOutOfStock && (
                    <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                      <p className="text-sm font-semibold text-red-700 mb-1">⚠ Cannot place order — out-of-stock items in cart:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {outOfStockItems.map((item) => (
                          <li key={item.product.id} className="text-xs text-red-600">{item.product.name}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-red-500 mt-2">Please go back to your cart and remove these items.</p>
                    </div>
                  )}

                  <Button type="submit" size="lg" className="w-full mt-4" disabled={isSubmitting || selectedItems.length === 0 || hasOutOfStock}>
                    {isSubmitting ? (
                      <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Processing...</span>
                    ) : hasStitchingSelected ? (
                      `Pay Now - ${formatPrice(upfrontAmount)}`
                    ) : (
                      `Place Order - ${formatPrice(grandTotal)}`
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-4 flex items-center justify-center gap-1"><Lock className="h-3 w-3" /> Your payment information is secure</p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}