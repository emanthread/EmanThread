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
} from "@/lib/commerce";
import type { ProductKind } from "@/lib/data";
import {
  defaultOptionLabelForKind,
  isProductEditorFieldVisible,
  productEditorSchemaForKind,
  type CatalogProductClassification,
  type ProductOptionPreset,
} from "@/lib/catalog-product-classification";

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
    optionLabel: defaultOptionLabelForKind("UNSTITCHED_FABRIC"),
    sizeGuideUrl: "",
    details: [],
    variants: [],
  };
}

function isProductKind(value: string): value is ProductKind {
  return (PRODUCT_KIND_VALUES as readonly string[]).includes(value);
}

function toDraft(profile: CommerceProfileResponse): CommerceProfileDraft {
  const editorSchema = productEditorSchemaForKind(profile.productKind);
  return {
    productKind: profile.productKind,
    // The storefront and order path enforce this too. Keeping the draft
    // normalized means a historical or manually-edited profile can never make
    // a non-fabric product look tailorable in the admin form.
    stitchingEligible:
      isProductEditorFieldVisible(editorSchema.fields.stitching)
        ? profile.stitchingEligible
        : false,
    requiresSelection:
      editorSchema.options.mode === "required" || profile.requiresSelection,
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
  const editorSchema = productEditorSchemaForKind(draft.productKind);
  const requiresSelection =
    editorSchema.options.mode === "required" || draft.requiresSelection;
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
      editorSchema.options.mode === "required"
        ? `Add at least one ${editorSchema.options.label.toLocaleLowerCase()} before saving this product`
        : "Add at least one option before requiring a customer selection"
    );
  }

  const optionLabel = draft.optionLabel.trim();
  if ((requiresSelection || variants.length > 0) && !optionLabel) {
    throw new Error("Enter a name for the product options");
  }
  const sizeGuideUrl = draft.sizeGuideUrl.trim();
  if (
    sizeGuideUrl &&
    !sizeGuideUrl.startsWith("/") &&
    !/^https?:\/\//i.test(sizeGuideUrl)
  ) {
    throw new Error("Size guide URL must begin with /, http://, or https://");
  }


  const details = draft.details.map((detail, index) => {
    const label = detail.label.trim();
    const value = detail.value.trim();
    if ((label && !value) || (!label && value)) {
      throw new Error(`Detail ${index + 1} needs both a label and a value`);
    }
    return { label, value };
  }).filter((detail) => detail.label && detail.value);

  return {
    productKind: draft.productKind,
    // Tailoring is intentionally limited to unstitched fabric. This is also
    // normalized by the protected API, so this UI value is never the only
    // enforcement point.
    stitchingEligible:
      isProductEditorFieldVisible(editorSchema.fields.stitching)
        ? draft.stitchingEligible
        : false,
    requiresSelection,
    optionLabel,
    sizeGuideUrl,
    details,
    variants,
  };
}

function normalizedOptionValue(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function suggestedOptionLabel(kind: ProductKind): string {
  return defaultOptionLabelForKind(kind);
}

function newOptionDraft(optionKey = "", label = ""): ProductVariantDraft {
  return {
    optionKey,
    label,
    sku: "",
    priceAdjustment: "0",
    stockQuantity: "0",
    inStock: false,
    isActive: true,
  };
}

function optionKeyFromLabel(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function canAddOptionPresets(
  variants: ProductVariantDraft[],
  presets: readonly ProductOptionPreset[]
): boolean {
  if (variants.length >= 50 || presets.length === 0) return false;
  const existingValues = new Set(
    variants.flatMap((variant) => [
      normalizedOptionValue(variant.optionKey),
      normalizedOptionValue(variant.label),
    ])
  );
  return presets.some(
    (preset) =>
      !existingValues.has(normalizedOptionValue(preset.optionKey)) &&
      !existingValues.has(normalizedOptionValue(preset.label))
  );
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
  onUserChange,
  onProfilePresenceChange,
  onLoadingChange,
  onLoadError,
  saveError,
  classification,
  showProductType = true,
  productTypeLocked = false,
}: {
  productId?: string;
  draft: CommerceProfileDraft;
  onChange: (draft: CommerceProfileDraft) => void;
  onUserChange?: (draft: CommerceProfileDraft) => void;
  onProfilePresenceChange?: (exists: boolean) => void;
  onLoadingChange: (loading: boolean) => void;
  onLoadError: (error: string | null) => void;
  saveError?: string | null;
  classification?: CatalogProductClassification | null;
  showProductType?: boolean;
  productTypeLocked?: boolean;
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
        if (!cancelled) {
          onProfilePresenceChange?.(Boolean(payload?.profile));
          if (payload?.profile) {
            onChange(toDraft(payload.profile as CommerceProfileResponse));
          }
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
    (onUserChange || onChange)({ ...draft, ...changes });
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
    if (productTypeLocked) return;
    if (!isProductKind(value)) return;
    const nextSchema = productEditorSchemaForKind(value);
    const supportsStitching = isProductEditorFieldVisible(
      nextSchema.fields.stitching
    );
    const kindChanged = value !== draft.productKind;
    const previousDefault = defaultOptionLabelForKind(draft.productKind);
    update({
      productKind: value,
      stitchingEligible: supportsStitching,
      requiresSelection: nextSchema.options.mode === "required",
      optionLabel:
        !draft.optionLabel || draft.optionLabel === previousDefault
          ? suggestedOptionLabel(value)
          : draft.optionLabel,
      sizeGuideUrl: isProductEditorFieldVisible(nextSchema.fields.sizeGuide)
        ? draft.sizeGuideUrl
        : "",
      variants: kindChanged ? [] : draft.variants,
    });
  };

  const effectiveKind = classification?.productKind || draft.productKind;
  const effectiveSchema =
    classification?.editorSchema || productEditorSchemaForKind(effectiveKind);
  const supportsStitching = isProductEditorFieldVisible(
    effectiveSchema.fields.stitching
  );
  const kindRequiresSelection = effectiveSchema.options.mode === "required";
  const showOptions =
    kindRequiresSelection || draft.requiresSelection || draft.variants.length > 0;

  const addOptionPresets = () => {
    const existingValues = new Set(
      draft.variants.flatMap((variant) => [
        normalizedOptionValue(variant.optionKey),
        normalizedOptionValue(variant.label),
      ])
    );
    const additions = effectiveSchema.options.presets.filter(
      (preset) =>
        !existingValues.has(normalizedOptionValue(preset.optionKey)) &&
        !existingValues.has(normalizedOptionValue(preset.label))
    ).map((preset) => newOptionDraft(preset.optionKey, preset.label));
    update({ variants: [...draft.variants, ...additions].slice(0, 50) });
  };

  return (
    <section
      id="commerce-section"
      tabIndex={-1}
      className="space-y-5 rounded-xl border bg-card p-5"
    >
      <div>
        <h2 className="font-semibold">Selling options</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {kindRequiresSelection
            ? `Add the ${draft.optionLabel.toLocaleLowerCase() || "options"} customers can choose.`
            : "Add sizes, volumes, shades, or formats only when this product has them."}
        </p>
      </div>

      {saveError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Selling settings need attention</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {showProductType && (
        <div className="space-y-2">
          <Label htmlFor="commerce-product-kind">Product type</Label>
          <Select
            value={draft.productKind}
            onValueChange={changeKind}
            disabled={productTypeLocked}
          >
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
          {productTypeLocked && (
            <p className="text-xs text-muted-foreground">
              Enable catalog assignments before changing the product type.
            </p>
          )}
        </div>
      )}

      {supportsStitching && (
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <Checkbox
            checked={draft.stitchingEligible}
            onCheckedChange={(value) => update({ stitchingEligible: value === true })}
          />
          <span>
            <span className="block font-medium">
              Offer {effectiveSchema.fields.stitching.label.toLocaleLowerCase()}
            </span>
            <span className="block text-xs text-muted-foreground">
              Customers can submit measurements and request tailoring when adding it to cart.
            </span>
          </span>
        </label>
      )}

      {showOptions && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="commerce-option-label">Option name</Label>
            <Input
              id="commerce-option-label"
              value={draft.optionLabel}
              onChange={(event) => update({ optionLabel: event.target.value })}
              placeholder={suggestedOptionLabel(effectiveKind)}
            />
          </div>
          {!kindRequiresSelection && (
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <Checkbox
            checked={draft.requiresSelection}
            disabled={draft.variants.length === 0}
            onCheckedChange={(value) => update({ requiresSelection: value === true })}
          />
          Customers must choose an option
        </label>
          )}
        </div>
      )}

      {kindRequiresSelection && (
        <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          A {draft.optionLabel.toLocaleLowerCase() || "size"} is required before this product can be added to cart.
        </p>
      )}

      {isProductEditorFieldVisible(effectiveSchema.fields.sizeGuide) && (
        <div className="space-y-2">
          <Label htmlFor="commerce-size-guide">
            {effectiveSchema.fields.sizeGuide.label} (optional)
          </Label>
          <Input
            id="commerce-size-guide"
            value={draft.sizeGuideUrl}
            onChange={(event) => update({ sizeGuideUrl: event.target.value })}
            placeholder={effectiveSchema.fields.sizeGuide.placeholder}
          />
        </div>
      )}

      <details className="rounded-lg border bg-muted/10">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">
          Additional product details (optional)
          <span className="ml-2 font-normal text-muted-foreground">
            {draft.details.length
              ? `${draft.details.length} added`
              : "Notes, material, age range, or box contents"}
          </span>
        </summary>
        <div className="space-y-3 border-t p-4">
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
          <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_auto]">
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
      </details>

      {!showOptions ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => update({ variants: [newOptionDraft()] })}
        >
          <Plus className="mr-2 h-4 w-4" />
          This product has options
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Label>{draft.optionLabel || "Options"}</Label>
              <p className="text-xs text-muted-foreground">
                Each option can have its own SKU, stock, and price adjustment.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canAddOptionPresets(
                draft.variants,
                effectiveSchema.options.presets
              ) && (
                <Button type="button" size="sm" variant="outline" onClick={addOptionPresets}>
                  Add common {effectiveSchema.options.label.toLocaleLowerCase()}s
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => update({ variants: [...draft.variants, newOptionDraft()] })}
                disabled={draft.variants.length >= 50}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add option
              </Button>
            </div>
          </div>

          {draft.variants.map((variant, index) => (
            <div key={variant.id || `new-option-${index}`} className="space-y-3 rounded-md border p-3">
              <div className="space-y-1">
                <Label htmlFor={`commerce-option-label-${index}`}>
                  {draft.optionLabel || "Option"} label
                </Label>
                <Input
                  id={`commerce-option-label-${index}`}
                  value={variant.label}
                  onChange={(event) =>
                    updateVariant(index, {
                      label: event.target.value,
                      optionKey: optionKeyFromLabel(event.target.value),
                    })
                  }
                  placeholder={effectiveSchema.options.itemPlaceholder}
                />
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
                  onChange={(event) => {
                    const stockQuantity = event.target.value;
                    updateVariant(index, {
                      stockQuantity,
                      inStock: Number(stockQuantity) > 0,
                    });
                  }}
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
                {variant.id ? "Retire option" : "Remove option"}
              </Button>
            </div>
          </div>
          ))}
        </div>
      )}
    </section>
  );
}
