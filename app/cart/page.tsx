"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { getProductImage } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/cart-store";
import { formatPrice, type Product } from "@/lib/data";
import { DEFAULT_STITCHING_FEE } from "@/lib/feature-flags";
import { Plus, Minus, X, ShoppingBag, Truck } from "lucide-react";

export default function CartPage() {
  const { items, updateQuantity, removeItem, getTotalPrice, getStitchingTotal, clearCart } =
    useCartStore();
  const totalPrice = getTotalPrice();
  const stitchingTotal = getStitchingTotal();

  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    setMounted(true);
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  }, []);

  if (!mounted) return null;

  const recommendedProducts = products
    .filter((p) => !items.some((item) => item.product.id === p.id))
    .slice(0, 4);

  const [freeShippingThreshold, setFreeShippingThreshold] = useState(5000);

  useEffect(() => {
    fetch("/api/store/public")
      .then((r) => r.ok ? r.json() : Promise.resolve(null))
      .then((data) => {
        if (data?.freeShippingThreshold) setFreeShippingThreshold(data.freeShippingThreshold);
      })
      .catch(() => {}); // fallback to 5000 default
  }, []);
  const remainingForFreeShipping = Math.max(
    0,
    freeShippingThreshold - totalPrice
  );

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen pt-20">
        {/* Page Header */}
        <div className="bg-secondary/50 py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-center">
              Shopping Cart
            </h1>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="h-20 w-20 mx-auto text-muted-foreground/30 mb-6" />
              <h2 className="text-2xl font-semibold mb-2">
                Your cart is empty
              </h2>
              <p className="text-muted-foreground mb-8">
                Looks like you haven&apos;t added any items to your cart yet.
              </p>
              <Button size="lg" asChild>
                <Link href="/shop">Continue Shopping</Link>
              </Button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-12">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-6">
                {/* Free Shipping Progress */}
                {remainingForFreeShipping > 0 ? (
                  <div className="bg-secondary/50 p-4 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                      <p className="text-sm">
                        Add{" "}
                        <span className="font-semibold">
                          {formatPrice(remainingForFreeShipping)}
                        </span>{" "}
                        more for free shipping
                      </p>
                    </div>
                    <div className="h-2 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            (totalPrice / freeShippingThreshold) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg flex items-center gap-3">
                    <Truck className="h-5 w-5" />
                    <p className="text-sm font-medium">
                      Congratulations! You qualify for free shipping.
                    </p>
                  </div>
                )}

                {/* Items List */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="hidden sm:grid grid-cols-12 gap-4 p-4 bg-secondary/50 text-sm font-medium text-muted-foreground">
                    <div className="col-span-6">Product</div>
                    <div className="col-span-2 text-center">Price</div>
                    <div className="col-span-2 text-center">Quantity</div>
                    <div className="col-span-2 text-right">Total</div>
                  </div>

                  {items.map((item) => (
                    <div
                      key={`cart-page-${item.product.id}`}
                      className="grid grid-cols-12 gap-4 p-4 border-t border-border items-center"
                    >
                      {/* Product */}
                      <div className="col-span-12 sm:col-span-6 flex gap-4">
                        <div className="relative w-20 h-24 sm:w-24 sm:h-32 bg-secondary rounded overflow-hidden shrink-0">
                          <Image
                            src={getProductImage(item.product.images)}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/product/${item.product.id}`}
                            className="font-medium hover:text-accent transition-colors line-clamp-2"
                          >
                            {item.product.name}
                          </Link>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.product.fabricType}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Color: {item.product.color}
                          </p>
                          {item.stitchingProfileName && item.stitchingProfileId !== "none" && (
                            <p className="text-xs text-amber-600 mt-1 font-medium">
                              ✂ {item.stitchingProfileName} (+{formatPrice(item.stitchingPrice ?? DEFAULT_STITCHING_FEE)} stitching/unit)
                            </p>
                          )}
                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="text-sm text-red-600 hover:text-red-700 mt-2 flex items-center gap-1 sm:hidden"
                          >
                            <X className="h-3 w-3" />
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="col-span-4 sm:col-span-2 text-center">
                        <span className="sm:hidden text-xs text-muted-foreground block mb-1">
                          Price
                        </span>
                        {formatPrice(item.product.price)}
                      </div>

                      {/* Quantity */}
                      <div className="col-span-4 sm:col-span-2 flex justify-center">
                        <div className="flex items-center border border-border rounded">
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.quantity - 1
                              )
                            }
                            className="p-2 hover:bg-secondary transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-3 text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.quantity + 1
                              )
                            }
                            className="p-2 hover:bg-secondary transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Total & Remove */}
                      <div className="col-span-4 sm:col-span-2 text-right">
                        <span className="sm:hidden text-xs text-muted-foreground block mb-1">
                          Total
                        </span>
                        <span className="font-semibold">
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeItem(item.product.id)}
                          className="hidden sm:block text-sm text-muted-foreground hover:text-red-600 mt-2 ml-auto transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cart Actions */}
                <div className="flex flex-wrap justify-between gap-4">
                  <Button variant="outline" asChild>
                    <Link href="/shop">Continue Shopping</Link>
                  </Button>
                  <Button variant="ghost" onClick={clearCart}>
                    Clear Cart
                  </Button>
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="sticky top-28 bg-secondary/30 rounded-lg p-6 space-y-6">
                  <h2 className="text-xl font-semibold">Order Summary</h2>

                  {/* Promo Code */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Promo Code
                    </label>
                    <div className="flex gap-2">
                      <Input placeholder="Enter code" />
                      <Button variant="outline">Apply</Button>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(totalPrice)}</span>
                    </div>
                    {stitchingTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Stitching Fee</span>
                        <span className="text-amber-600 font-medium">+{formatPrice(stitchingTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>
                        {totalPrice >= freeShippingThreshold
                          ? "Free"
                          : "Calculated at checkout"}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg pt-3 border-t border-border">
                      <span>Total</span>
                      <span>{formatPrice(totalPrice + stitchingTotal)}</span>
                    </div>
                  </div>

                  <Button size="lg" className="w-full" asChild>
                    <Link href="/checkout">Proceed to Checkout</Link>
                  </Button>

                  {/* Trust Badges */}
                  <div className="flex justify-center gap-4 pt-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        Secure Checkout
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recommended Products */}
        {recommendedProducts.length > 0 && (
          <section className="bg-secondary/30 py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-semibold mb-8">
                Recommended For You
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommendedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
