"use client";

import { useEffect } from "react";
import { getCartInventoryKey, useCartStore } from "@/lib/cart-store";

/** Refresh only the visible basket, and share requests across cart surfaces. */
export function useCartInventory(enabled = true) {
  const items = useCartStore((state) => state.items);
  const status = useCartStore((state) => state.inventoryStatus);
  const error = useCartStore((state) => state.inventoryError);
  const validatedKey = useCartStore((state) => state.inventoryValidatedKey);
  const refresh = useCartStore((state) => state.refreshInventory);
  const key = getCartInventoryKey(items);
  const hasItems = items.length > 0;

  useEffect(() => {
    if (!enabled || !hasItems) return;
    void refresh().catch(() => {});
  }, [enabled, hasItems, refresh]);

  useEffect(() => {
    if (!enabled || !hasItems || validatedKey === key || status === "checking" || status === "error") return;
    void refresh().catch(() => {});
  }, [enabled, hasItems, key, validatedKey, status, refresh]);

  useEffect(() => {
    if (!enabled || !hasItems) return;
    const check = () => { if (document.visibilityState === "visible") void refresh().catch(() => {}); };
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    document.addEventListener("visibilitychange", check);
    const timer = window.setInterval(check, 30_000);
    return () => {
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
      document.removeEventListener("visibilitychange", check);
      window.clearInterval(timer);
    };
  }, [enabled, hasItems, refresh]);

  return { isReady: !hasItems || (status === "ready" && validatedKey === key), error,
    isChecking: status === "checking" || (enabled && hasItems && status !== "error" && validatedKey !== key),
    retry: () => { void refresh().catch(() => {}); } };
}
