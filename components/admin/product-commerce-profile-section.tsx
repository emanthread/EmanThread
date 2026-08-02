"use client";

import { useEffect } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminFetch } from "@/lib/admin-fetch";
import {
  PRODUCT_KINDS,
  PRODUCT_KIND_VALUES,
  productKindRequiresSelection,
} from "@/lib/commerce";
import type { ProductKind } from "@/lib/data";

export type ProductVariantDraft = {
  id?: string;
  optionKey: string;
  label: string;
  sku: string;
  priceAdjustment: string;
  stockQuantity: string;
  inStock: boolean;
  isActive: boolean;
};

export type CommerceProfileDraft = {
  productKind: ProductKind;
  stitchingEligible: boolean;
  requiresSelection: boolean;
  optionLabel: string;
  sizeGuideUrl: string;
  details: Array<{ label: string; value: string }>;
  variants: ProductVariantDraft[];
};

type CommerceProfilePayload = Omit<CommerceProfileDraft, "variants"> & {
  variants: Array<{
    id?: string;
    optionKey: string;
    label: string;
    sku?: string;
    priceAdjustment: number;
    stockQuantity: number;
    inStock: boolean;
    isActive: boolean;
  }>;
};

type CommerceProfileResponse = {
  productKind: ProductKind;
  stitchingEligible: boolean;
  requiresSelection: boolean;
  optionLabel?: string;
  sizeGuideUrl?: string;
  details?: Array<{ label: string; value: string }>;
  variants?: Array<{
    id: string;
    optionKey: string;
    label: string;
    sku?: string;
    priceAdjustment: number;
    stockQuantity: number;
    inStock: boolean;
    isActive: boolean;
  }>;
};

export function emptyCommerceProfileDraft(): CommerceProfileDraft {
  return {
    productKind: "UNSTITCHED_FABRIC",
    stitchingEligible: true,
    requiresSelection: false,
    optionLabel: "Size",
    sizeGuideUrl: "",
    details: [],
    variants: [],
  };
}

function isProductKind(value: string): value is ProductKind {
  return (PRODUCT_KIND_VALUES as readonly string[]).includes(value);
}

function toDraft(profile: CommerceProfileResponse): CommerceProfileDraft {
  return {
    productKind: profile.productKind,
    // The storefront and order path enforce this too. Keeping the draft
    // normalized means a historical or manually-edited profile can never make
    // a non-fabric product look tailorable in the admin form.
    stitchingEligible:
      profile.productKind === "UNSTITCHED_FABRIC"
        ? profile.stitchingEligible
        : false,
    requiresSelection:
      productKindRequiresSelection(profile.productKind) || profile.requiresSelection,
    optionLabel: profile.optionLabel || "",
    sizeGuideUrl: profile.sizeGuideUrl || "",
    details: Array.isArray(profile.details) ? profile.details : [],
    variants: (profile.variants || []).map((variant) => ({
      id: variant.id,
      optionKey: variant.optionKey,
      label: variant.label,
      sku: variant.sku || "",
      priceAdjustment: String(variant.priceAdjustment),
      stockQuantity: String(variant.stockQuantity),
      inStock: variant.inStock,
      isActive: variant.isActive,
    })),
  };
}

/**
 * Serializes exclusively the additive profile payload. It deliberately never
 * changes any of the established Product fields sent by the surrounding form.
 */
export function serializeCommerceProfile(
  draft: CommerceProfileDraft
): CommerceProfilePayload {
  const requiresSelection =
    productKindRequiresSelection(draft.productKind) || draft.requiresSelection;
  const seenKeys = new Set<string>();
  const seenSkus = new Set<string>();
  const variants = draft.variants.map((variant, index) => {
    const optionKey = variant.optionKey.trim();
    const label = variant.label.trim();
    const sku = variant.sku.trim();
    const priceAdjustment = Number(variant.priceAdjustment || "0");
    const stockQuantity = Number(variant.stockQuantity || "0");

    if (!optionKey || !label) {
      throw new Error(`Option ${index + 1} needs both a key and customer label`);
    }
    if (!Number.isFinite(priceAdjustment)) {
      throw new Error(`Option ${index + 1} has an invalid price adjustment`);
    }
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      throw new Error(`Option ${index + 1} stock must be a whole number of 0 or more`);
    }

    const normalizedKey = optionKey.toLocaleLowerCase();
    if (seenKeys.has(normalizedKey)) {
      throw new Error("Each option key must be unique");
    }
    seenKeys.add(normalizedKey);

    const normalizedSku = sku.toLocaleLowerCase();
    if (normalizedSku && seenSkus.has(normalizedSku)) {
      throw new Error("Each option SKU must be unique");
    }
    if (normalizedSku) seenSkus.add(normalizedSku);

    return {
      ...(variant.id ? { id: variant.id } : {}),
      optionKey,
      label,
      ...(sku ? { sku } : {}),
      priceAdjustment,
      stockQuantity,
      inStock: variant.inStock,
      isActive: variant.isActive,
    };
  });

  if (requiresSelection && variants.length === 0) {
    throw new Error(
      productKindRequiresSelection(draft.productKind)
        ? "Add at least one size or option before saving ready-to-wear or teens merchandise"
        : "Add at least one option before requiring a customer selection"
    );
  }

  return {
    productKind: draft.productKind,
    // Tailoring is intentionally limited to unstitched fabric. This is also
    // normalized by the protected API, so this UI value is never the only
    // enforcement point.
    stitchingEligible:
      draft.productKind === "UNSTITCHED_FABRIC"
        ? draft.stitchingEligible
        : false,
    requiresSelection,
    optionLabel: draft.optionLabel.trim(),
    sizeGuideUrl: draft.sizeGuideUrl.trim(),
    details: draft.details
      .map((detail) => ({ label: detail.label.trim(), value: detail.value.trim() }))
      .filter((detail) => detail.label || detail.value),
    variants,
  };
}

function suggestedOptionLabel(kind: ProductKind): string {
  switch (kind) {
    case "READY_TO_WEAR":
    case "TEENS":
      return "Size";
    case "FRAGRANCE":
      return "Volume";
    case "BEAUTY":
      return "Shade / option";
    case "GIFT":
    case "GIFT_BOX":
      return "Gift option";
    default:
      return "Size";
  }
}

function readApiError(payload: unknown, fallback: string): string {
  return payload && typeof payload === "object" && "error" in payload
    ? String(payload.error)
    : fallback;
}

export function ProductCommerceProfileSection({
  productId,
  draft,
  onChange,
  onLoadingChange,
  onLoadError,
  saveError,
}: {
  productId?: string;
  draft: CommerceProfileDraft;
  onChange: (draft: CommerceProfileDraft) => void;
  onLoadingChange: (loading: boolean) => void;
  onLoadError: (error: string | null) => void;
  saveError?: string | null;
}) {
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      onLoadError(null);
      if (!productId) {
        onLoadingChange(false);
        return;
      }

      onLoadingChange(true);
      try {
        const response = await adminFetch(
          `/api/admin/products/${encodeURIComponent(productId)}/commerce-profile`
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(readApiError(payload, "Failed to load merchandise settings"));
        }
        if (!cancelled && payload?.profile) {
          onChange(toDraft(payload.profile as CommerceProfileResponse));
        }
      } catch (error) {
        if (!cancelled) {
          onLoadError(
            error instanceof Error ? error.message : "Failed to load merchandise settings"
          );
        }
      } finally {
        if (!cancelled) onLoadingChange(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
    // A load is intentionally tied to the dialog/product identity only, so
    // editing a field never replaces an in-progress draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const update = (changes: Partial<CommerceProfileDraft>) => {
    onChange({ ...draft, ...changes });
  };

  const updateVariant = (index: number, changes: Partial<ProductVariantDraft>) => {
    update({
      variants: draft.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...changes } : variant
      ),
    });
  };

  const updateDetail = (index: number, changes: Partial<CommerceProfileDraft["details"][number]>) => {
    update({
      details: draft.details.map((detail, detailIndex) =>
        detailIndex === index ? { ...detail, ...changes } : detail
      ),
    });
  };

  const changeKind = (value: string) => {
    if (!isProductKind(value)) return;
    const supportsStitching = value === "UNSTITCHED_FABRIC";
    update({
      productKind: value,
      stitchingEligible: supportsStitching,
      requiresSelection: productKindRequiresSelection(value),
      optionLabel: draft.optionLabel || suggestedOptionLabel(value),
    });
  };

  const supportsStitching = draft.productKind === "UNSTITCHED_FABRIC";
  const kindRequiresSelection = productKindRequiresSelection(draft.productKind);

  return (
    <section className="space-y-4 rounded-lg border border-dashed p-4">
      <div>
        <h3 className="font-medium">Merchandise type & sellable options</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Use this only for the new catalog. The legacy category, fabric type, stock,
          and existing listings above remain intact. Removed options are archived, not deleted.
        </p>
      </div>

      {saveError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Product saved; merchandise settings need attention</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="commerce-product-kind">Product type</Label>
          <Select value={draft.productKind} onValueChange={changeKind}>
            <SelectTrigger id="commerce-product-kind">
              <SelectValue placeholder="Choose a product type" />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_KINDS.map((kind) => (
                <SelectItem key={kind.value} value={kind.value}>
                  {kind.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="commerce-option-label">Customer option label</Label>
          <Input
            id="commerce-option-label"
            value={draft.optionLabel}
            onChange={(event) => update({ optionLabel: event.target.value })}
            placeholder={suggestedOptionLabel(draft.productKind)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <Checkbox
            checked={draft.stitchingEligible}
            disabled={!supportsStitching}
            onCheckedChange={(value) => update({ stitchingEligible: value === true })}
          />
          {supportsStitching
            ? "Offer stitching for this product"
            : "Stitching is available only for unstitched fabric"}
        </label>
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <Checkbox
            checked={kindRequiresSelection || draft.requiresSelection}
            disabled={kindRequiresSelection || draft.variants.length === 0}
            onCheckedChange={(value) => update({ requiresSelection: value === true })}
          />
          {kindRequiresSelection
            ? "A size or option is required before this product can be added to cart"
            : "Require a customer option before cart"}
        </label>
      </div>

      {(draft.productKind === "READY_TO_WEAR" || draft.productKind === "TEENS") && (
        <div className="space-y-2">
          <Label htmlFor="commerce-size-guide">Size guide URL (optional)</Label>
          <Input
            id="commerce-size-guide"
            value={draft.sizeGuideUrl}
            onChange={(event) => update({ sizeGuideUrl: event.target.value })}
            placeholder="/size-guide or https://…"
          />
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label>Product details</Label>
            <p className="text-xs text-muted-foreground">For example: notes, material, age range, or box contents.</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => update({ details: [...draft.details, { label: "", value: "" }] })}
            disabled={draft.details.length >= 12}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add detail
          </Button>
        </div>
        {draft.details.map((detail, index) => (
          <div key={`${index}-${detail.label}`} className="grid gap-2 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_auto]">
            <Input
              aria-label={`Detail ${index + 1} label`}
              value={detail.label}
              onChange={(event) => updateDetail(index, { label: event.target.value })}
              placeholder="Label"
            />
            <Input
              aria-label={`Detail ${index + 1} value`}
              value={detail.value}
              onChange={(event) => updateDetail(index, { value: event.target.value })}
              placeholder="Value"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => update({ details: draft.details.filter((_, detailIndex) => detailIndex !== index) })}
              aria-label={`Remove detail ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label>Sizes, volumes, shades, or gift options</Label>
            <p className="text-xs text-muted-foreground">
              Each option has independent stock and a possible price adjustment. Leave this empty for one-format products.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              update({
                variants: [
                  ...draft.variants,
                  {
                    optionKey: "",
                    label: "",
                    sku: "",
                    priceAdjustment: "0",
                    stockQuantity: "0",
                    inStock: true,
                    isActive: true,
                  },
                ],
              })
            }
            disabled={draft.variants.length >= 50}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add option
          </Button>
        </div>

        {draft.variants.map((variant, index) => (
          <div key={variant.id || `new-option-${index}`} className="space-y-3 rounded-md border p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`commerce-option-key-${index}`}>Internal option key</Label>
                <Input
                  id={`commerce-option-key-${index}`}
                  value={variant.optionKey}
                  onChange={(event) => updateVariant(index, { optionKey: event.target.value })}
                  placeholder="small, 50ml, gift-wrap"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`commerce-option-label-${index}`}>Customer label</Label>
                <Input
                  id={`commerce-option-label-${index}`}
                  value={variant.label}
                  onChange={(event) => updateVariant(index, { label: event.target.value })}
                  placeholder="Small, 50 ml, With gift wrap"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor={`commerce-option-sku-${index}`}>Option SKU</Label>
                <Input
                  id={`commerce-option-sku-${index}`}
                  value={variant.sku}
                  onChange={(event) => updateVariant(index, { sku: event.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`commerce-option-price-${index}`}>Price adjustment (PKR)</Label>
                <Input
                  id={`commerce-option-price-${index}`}
                  type="number"
                  value={variant.priceAdjustment}
                  onChange={(event) => updateVariant(index, { priceAdjustment: event.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`commerce-option-stock-${index}`}>Option stock</Label>
                <Input
                  id={`commerce-option-stock-${index}`}
                  type="number"
                  min="0"
                  step="1"
                  value={variant.stockQuantity}
                  onChange={(event) => updateVariant(index, { stockQuantity: event.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={variant.isActive}
                    onCheckedChange={(value) => updateVariant(index, { isActive: value === true })}
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={variant.inStock}
                    onCheckedChange={(value) => updateVariant(index, { inStock: value === true })}
                  />
                  Available to sell
                </label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => update({ variants: draft.variants.filter((_, variantIndex) => variantIndex !== index) })}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Archive option
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
