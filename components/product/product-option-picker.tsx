"use client";

import { Check } from "lucide-react";
import { formatPrice, type Product, type ProductVariant } from "@/lib/data";
import {
  getActiveVariants,
  getProductCommerce,
  getVariantUnitPrice,
  isVariantAvailable,
  requiresVariantSelectionForPurchase,
} from "@/lib/commerce";
import { cn } from "@/lib/utils";

interface ProductOptionPickerProps {
  product: Product;
  selectedVariantId?: string | null;
  onSelect: (variant: ProductVariant) => void;
  invalid?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * A small, reusable option picker for products which have the additive
 * commerce profile enabled. It intentionally renders nothing for the legacy
 * catalogue, so existing fabric cards keep their current experience.
 */
export function ProductOptionPicker({
  product,
  selectedVariantId,
  onSelect,
  invalid = false,
  compact = false,
  className,
}: ProductOptionPickerProps) {
  const variants = getActiveVariants(product);
  const commerce = getProductCommerce(product);

  if (!product.commerce) return null;

  const optionLabel = commerce.optionLabel?.trim() || "Option";
  const selectionRequired = requiresVariantSelectionForPurchase(product);

  if (variants.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-amber-300 bg-amber-50/70 p-3 text-sm text-amber-900",
          className,
        )}
        role="status"
      >
        <p className="font-medium">{optionLabel} temporarily unavailable</p>
        <p className="mt-1 text-xs text-amber-800">
          This item requires an available {optionLabel.toLowerCase()} before it can be ordered.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border/70 bg-background/80 p-3",
        invalid && "border-destructive ring-1 ring-destructive/30",
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {optionLabel}
          {selectionRequired && <span className="text-destructive"> *</span>}
        </p>
        {selectionRequired && (
          <span className="text-[11px] text-muted-foreground">Required</span>
        )}
      </div>

      <div
        aria-label={`Choose ${optionLabel}`}
        className={cn("flex flex-wrap gap-2", compact && "gap-1.5")}
        role="radiogroup"
      >
        {variants.map((variant) => {
          const available = isVariantAvailable(variant);
          const selected = variant.id === selectedVariantId;
          const unitPrice = getVariantUnitPrice(product, variant);

          return (
            <button
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!available}
              onClick={() => onSelect(variant)}
              className={cn(
                "relative inline-flex min-h-9 items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:border-primary/60 hover:bg-secondary",
                !available && "cursor-not-allowed border-border/60 bg-muted text-muted-foreground line-through opacity-70"
              )}
              title={available ? `${variant.label} — ${formatPrice(unitPrice)}` : `${variant.label} is out of stock`}
            >
              {selected && <Check className="h-3 w-3" aria-hidden="true" />}
              <span>{variant.label}</span>
              {variant.priceAdjustment !== 0 && (
                <span className={cn("text-[10px]", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {variant.priceAdjustment > 0 ? "+" : ""}{formatPrice(variant.priceAdjustment)}
                </span>
              )}
              {!available && <span className="sr-only">Out of stock</span>}
            </button>
          );
        })}
      </div>

      {invalid && (
        <p className="mt-2 text-xs text-destructive">
          Please choose a {optionLabel.toLowerCase()} before adding this item.
        </p>
      )}
    </div>
  );
}
