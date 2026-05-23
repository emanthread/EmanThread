"use client";
 
import { useState, useEffect } from "react";

import Image from "next/image";
import Link from "next/link";
import { X, Plus, Minus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/data";
import { cn } from "@/lib/utils";

export function CartDrawer() {
  const [mounted, setMounted] = useState(false);
  const { items, isOpen, closeCart, updateQuantity, removeItem, getTotalPrice } =
    useCartStore();
  const totalPrice = getTotalPrice();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm transition-opacity duration-300",
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        onClick={closeCart}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-background shadow-xl transition-transform duration-300 flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold tracking-wide">Your Cart</h2>
          <Button variant="ghost" size="icon" onClick={closeCart}>
            <X className="h-5 w-5" />
            <span className="sr-only">Close cart</span>
          </Button>
        </div>

        {/* Cart Items */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Your cart is empty
            </p>
            <p className="text-sm text-muted-foreground/70 mt-2">
              Add some premium fabrics to get started
            </p>
            <Button className="mt-6" onClick={closeCart} asChild>
              <Link href="/shop">Continue Shopping</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.map((item) => (
                <div
                  key={`cart-${item.product.id}`}
                  className="flex gap-4 pb-6 border-b border-border last:border-0"
                >
                  <div className="relative w-24 h-32 bg-secondary rounded overflow-hidden shrink-0">
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm leading-tight line-clamp-2">
                      {item.product.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.product.fabricType}
                    </p>
                    <p className="text-sm font-semibold mt-2">
                      {formatPrice(item.product.price)}
                    </p>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-border rounded">
                        <button
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity - 1)
                          }
                          className="p-2 hover:bg-secondary transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-4 text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity + 1)
                          }
                          className="p-2 hover:bg-secondary transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-lg font-semibold">
                  {formatPrice(totalPrice)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Shipping and taxes calculated at checkout
              </p>
              <div className="space-y-3">
                <Button className="w-full" size="lg" asChild>
                  <Link href="/checkout" onClick={closeCart}>
                    Proceed to Checkout
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                  asChild
                >
                  <Link href="/cart" onClick={closeCart}>
                    View Cart
                  </Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
