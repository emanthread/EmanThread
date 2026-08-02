"use client";

import { useState } from "react";
import { Loader2, ShoppingCart } from "lucide-react";
import { ProductOptionPicker } from "@/components/product/product-option-picker";
import { Button } from "@/components/ui/button";
import { useCartStore, type CartSelection } from "@/lib/cart-store";
import {
  getActiveVariants,
  getVariantUnitPrice,
  isProductAvailableForPurchase,
  isVariantAvailable,
  productOptionForVariant,
  requiresVariantSelectionForPurchase,
} from "@/lib/commerce";
import type { Product, ProductVariant } from "@/lib/data";
import { cn } from "@/lib/utils";

export type WishlistProductResolution = "loading" | "ready" | "unavailable";

interface WishlistAddToCartProps {
  product: Product;
  resolution: WishlistProductResolution;
  iconOnly?: boolean;
  className?: string;
  pickerClassName?: string;
}

/**
 * Keeps a saved product's legacy one-click cart action while making a current,
 * required commerce option explicit. Wishlist records are client snapshots, so
 * callers pass a resolved live product before this control can add it.
 */
export function WishlistAddToCart({
  product,
  resolution,
  iconOnly = false,
  className,
  pickerClassName,
}: WishlistAddToCartProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [optionError, setOptionError] = useState(false);
  const { addItem } = useCartStore();
  const activeVariants = getActiveVariants(product);
  const requiresVariantSelection = requiresVariantSelectionForPurchase(product);
  const hasActiveOptions = activeVariants.length > 0;
  const hasAvailableOptions = activeVariants.some(isVariantAvailable);
  const productAvailable = isProductAvailableForPurchase(product);
  const selectedVariant = activeVariants.find((variant) => variant.id === selectedVariantId) ?? null;
  const optionLabel = product.commerce?.optionLabel?.trim() || "option";
  const unavailableReason = requiresVariantSelection
    ? !hasActiveOptions
      ? `No ${optionLabel} options are currently available`
      : !hasAvailableOptions
        ? "Out of stock"
        : null
    : !productAvailable
      ? "Out of stock"
      : null;

  const addSelectedVariant = (variant: ProductVariant) => {
    const selection: CartSelection = {
      variant: {
        id: variant.id,
        label: variant.label,
        sku: variant.sku,
        priceAdjustment: variant.priceAdjustment,
      },
      selectedOptions: [productOptionForVariant(product, variant)],
      unitPrice: getVariantUnitPrice(product, variant),
    };
    addItem(product, 1, undefined, selection);
  };

  const handleAdd = () => {
    if (resolution !== "ready" || unavailableReason) return;

    if (!requiresVariantSelection) {
      // This is intentionally the established one-click legacy path.
      addItem(product);
      return;
    }

    if (!selectedVariant || !isVariantAvailable(selectedVariant)) {
      setOptionError(isPickerOpen);
      setIsPickerOpen(true);
      return;
    }

    addSelectedVariant(selectedVariant);
  };

  const isDisabled = resolution !== "ready" || Boolean(unavailableReason);
  const buttonLabel = (() => {
    if (resolution === "loading") return "Checking options";
    if (resolution === "unavailable") return "Product unavailable";
    if (unavailableReason) return unavailableReason;
    if (requiresVariantSelection && !selectedVariant) return `Choose ${optionLabel}`;
    return "Add to Cart";
  })();

  return (
    <div className={cn("space-y-2", className)}>
      <Button
        type="button"
        size="sm"
        disabled={isDisabled}
        aria-expanded={requiresVariantSelection ? isPickerOpen : undefined}
        aria-label={iconOnly ? buttonLabel : undefined}
        title={isDisabled ? buttonLabel : undefined}
        onClick={handleAdd}
      >
        {resolution === "loading" ? (
          <Loader2 className={cn("animate-spin", iconOnly ? "h-3 w-3" : "h-4 w-4 mr-2")} />
        ) : (
          <ShoppingCart className={cn(iconOnly ? "h-3 w-3" : "h-4 w-4 mr-2")} />
        )}
        {!iconOnly && buttonLabel}
        {iconOnly && <span className="sr-only">{buttonLabel}</span>}
      </Button>

      {requiresVariantSelection && isPickerOpen && !unavailableReason && resolution === "ready" && (
        <ProductOptionPicker
          product={product}
          selectedVariantId={selectedVariantId}
          onSelect={(variant) => {
            setSelectedVariantId(variant.id);
            setOptionError(false);
            setIsPickerOpen(false);
          }}
          invalid={optionError}
          compact
          className={pickerClassName}
        />
      )}
    </div>
  );
}
