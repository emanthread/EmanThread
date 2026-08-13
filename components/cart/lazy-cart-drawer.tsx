"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/cart-store";

const CartDrawerContent = dynamic(
  () => import("@/components/cart/cart-drawer").then((module) => module.CartDrawer),
  { ssr: false, loading: () => null },
);

/**
 * The drawer is an off-screen overlay. Keep it out of the critical bundle,
 * while loading immediately for an open/restored cart and warming it shortly
 * after initial interaction has settled.
 */
export function CartDrawer() {
  const isOpen = useCartStore((state) => state.isOpen);
  const hasItems = useCartStore((state) => state.items.length > 0);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (isOpen || hasItems) {
      setShouldLoad(true);
      return;
    }

    const timer = window.setTimeout(() => setShouldLoad(true), 6_000);
    return () => window.clearTimeout(timer);
  }, [hasItems, isOpen]);

  return shouldLoad ? <CartDrawerContent /> : null;
}
