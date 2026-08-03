"use client";

import type { ReactNode } from "react";
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
  guideAction?: ReactNode;
}

function isGarmentSizeOption(value: string): boolean {
  return /^(?:xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl|\d{2}|\d{2}-\d{2}|one size|free size)$/i.test(
    value.trim()
  );
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
  guideAction,
}: ProductOptionPickerProps) {
  const variants = getActiveVariants(product);
  const commerce = getProductCommerce(product);

  if (!product.commerce) return null;

  const optionLabel = commerce.optionLabel?.trim() || "Option";
  const selectionRequired = requiresVariantSelectionForPurchase(product);
  const usesCircularSizeChoices =
    /\bsize\b/i.test(optionLabel) && variants.every((variant) => isGarmentSizeOption(variant.label));

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
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          Select {optionLabel}
          {selectionRequired && <span className="text-destructive"> *</span>}
        </p>
        <div className="flex items-center gap-3">
          {selectionRequired && (
            <span className="text-[11px] text-muted-foreground">Required</span>
          )}
          {guideAction}
        </div>
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
                "relative inline-flex items-center justify-center border text-xs font-medium transition-colors",
                usesCircularSizeChoices
                  ? cn(
                      "h-11 min-w-11 rounded-full px-2",
                      compact && "h-9 min-w-9 px-1.5 text-[11px]"
                    )
                  : cn(
                      "min-h-9 gap-1 rounded-md px-3 py-1.5",
                      compact && "px-2 py-1 text-[11px]"
                    ),
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:border-primary/60 hover:bg-secondary",
                !available && "cursor-not-allowed border-border/60 bg-muted text-muted-foreground line-through opacity-70"
              )}
              title={available ? `${variant.label} — ${formatPrice(unitPrice)}` : `${variant.label} is out of stock`}
            >
              {selected && !usesCircularSizeChoices && <Check className="h-3 w-3" aria-hidden="true" />}
              <span>{variant.label}</span>
              {variant.priceAdjustment !== 0 && !usesCircularSizeChoices && (
                <span className={cn("text-[10px]", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {variant.priceAdjustment > 0 ? "+" : ""}{formatPrice(variant.priceAdjustment)}
                </span>
              )}
              {variant.priceAdjustment !== 0 && usesCircularSizeChoices && (
                <span className="sr-only">
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
