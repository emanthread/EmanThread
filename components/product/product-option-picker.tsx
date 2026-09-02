"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { formatPrice, type Product, type ProductVariant } from "@/lib/data";
import {
  getActiveVariants,
  getProductOptions,
  getVariantSelections,
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

const CANONICAL_SIZE_LABELS: Record<string, string> = {
  "extra extra small": "XXS",
  "double extra small": "XXS",
  xxs: "XXS",
  "extra small": "XS",
  xs: "XS",
  small: "S",
  s: "S",
  medium: "M",
  med: "M",
  m: "M",
  large: "L",
  l: "L",
  "extra large": "XL",
  xl: "XL",
  "extra extra large": "XXL",
  "double extra large": "XXL",
  "double xl": "XXL",
  "2xl": "XXL",
  xxl: "XXL",
  "triple extra large": "XXXL",
  "3xl": "XXXL",
  xxxl: "XXXL",
};

export function canonicalStorefrontSizeLabel(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return CANONICAL_SIZE_LABELS[normalized] || value.trim();
}

function isGarmentSizeOption(value: string): boolean {
  return /^(?:xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl|\d{2}|\d{2}-\d{2}|one size|free size)$/i.test(
    canonicalStorefrontSizeLabel(value),
  );
}

/** Axis-aware picker which can only resolve to a real sellable combination. */
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
  const options = getProductOptions(product);
  if (!product.commerce) return null;

  const selectionRequired = requiresVariantSelectionForPurchase(product);
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId);
  const selectedValueByOptionId = new Map(
    selectedVariant
      ? getVariantSelections(product, selectedVariant).map((selection) => [
          selection.optionId,
          selection.valueId,
        ])
      : [],
  );

  const variantHasValues = (variant: ProductVariant, values: Map<string, string>) => {
    const selections = new Map(
      getVariantSelections(product, variant).map((selection) => [
        selection.optionId,
        selection.valueId,
      ]),
    );
    return [...values].every(([optionId, valueId]) => selections.get(optionId) === valueId);
  };

  const chooseValue = (optionId: string, valueId: string) => {
    const preferred = new Map(selectedValueByOptionId);
    preferred.set(optionId, valueId);
    const exact = variants.find(
      (variant) => isVariantAvailable(variant) && variantHasValues(variant, preferred),
    );
    const fallback = variants.find((variant) =>
      isVariantAvailable(variant) &&
      getVariantSelections(product, variant).some(
        (selection) => selection.optionId === optionId && selection.valueId === valueId,
      )
    );
    if (exact || fallback) onSelect(exact || fallback!);
  };

  if (variants.length === 0 || options.length === 0) {
    return (
      <div className={cn("rounded-lg border border-amber-300 bg-amber-50/70 p-3 text-sm text-amber-900", className)} role="status">
        <p className="font-medium">Options temporarily unavailable</p>
        <p className="mt-1 text-xs text-amber-800">This item requires an available combination before it can be ordered.</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border/70 bg-background/80 p-3", invalid && "border-destructive ring-1 ring-destructive/30", className)}>
      {options.map((option) => {
        const usesCircularSizeChoices = option.type === "SIZE" &&
          option.values.every((value) => isGarmentSizeOption(value.label));
        const usesColorSwatches = option.type === "COLOR" || option.type === "SHADE";

        return (
          <div key={option.id} className="mb-4 last:mb-0">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium">
                Select {option.label}
              </p>
              <div className="flex items-center gap-3">
                {option.type === "SIZE" ? guideAction : null}
              </div>
            </div>
            <div aria-label={`Choose ${option.label}`} className={cn("flex flex-wrap gap-2", compact && "gap-1.5")} role="radiogroup">
              {option.values.filter((value) => value.isActive).map((value) => {
                const displayLabel = option.type === "SIZE"
                  ? canonicalStorefrontSizeLabel(value.label)
                  : value.label;
                const requested = new Map(selectedValueByOptionId);
                requested.delete(option.id);
                requested.set(option.id, value.id);
                const matching = variants.filter((variant) => variantHasValues(variant, requested));
                const available = matching.some(isVariantAvailable);
                const selected = selectedValueByOptionId.get(option.id) === value.id;
                const soleVariant = matching.length === 1 ? matching[0] : undefined;
                const unitPrice = getVariantUnitPrice(product, soleVariant);

                return (
                  <button
                    key={value.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={!available}
                    onClick={() => chooseValue(option.id, value.id)}
                    className={cn(
                      "relative inline-flex items-center justify-center border text-xs font-medium transition-colors",
                      usesColorSwatches
                        ? cn("min-h-12 gap-2 rounded-full py-1.5 pl-1.5 pr-3", compact && "min-h-10 pr-2 text-[11px]")
                        : usesCircularSizeChoices
                          ? cn("h-11 min-w-11 rounded-full px-2", compact && "h-9 min-w-9 px-1.5 text-[11px]")
                          : cn("min-h-9 gap-1 rounded-md px-3 py-1.5", compact && "px-2 py-1 text-[11px]"),
                      selected
                        ? usesColorSwatches
                          ? "border-primary bg-secondary text-foreground ring-2 ring-primary/20 ring-offset-2"
                          : "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:border-primary/60 hover:bg-secondary",
                      !available && "cursor-not-allowed border-border/60 bg-muted text-muted-foreground line-through opacity-70",
                    )}
                    title={available ? `${displayLabel}${soleVariant ? ` — ${formatPrice(unitPrice)}` : ""}` : `${displayLabel} is unavailable with the current selection`}
                  >
                    {usesColorSwatches && (
                      <span aria-hidden="true" className="relative h-8 w-8 shrink-0 rounded-full border border-black/10 shadow-inner" style={{ backgroundColor: value.swatchHex || "#d1d5db" }}>
                        {selected && <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />}
                      </span>
                    )}
                    {selected && !usesCircularSizeChoices && !usesColorSwatches && <Check className="h-3 w-3" aria-hidden="true" />}
                    <span>{displayLabel}</span>
                    {soleVariant && soleVariant.priceAdjustment !== 0 && !usesCircularSizeChoices && (
                      <span className={cn("text-[10px]", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        {soleVariant.priceAdjustment > 0 ? "+" : ""}{formatPrice(soleVariant.priceAdjustment)}
                      </span>
                    )}
                    {!available && <span className="sr-only">Unavailable</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {invalid && <p className="mt-2 text-xs text-destructive">Please choose an available combination before adding this item.</p>}
    </div>
  );
}
