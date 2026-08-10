"use client";

import { useEffect } from "react";
import Image from "next/image";
import { AlertTriangle, ImagePlus, Plus, Trash2, X } from "lucide-react";
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
import type { ProductKind, ProductOptionType } from "@/lib/data";
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
  colorHex: string;
  images: string[];
  selections?: Array<{ optionKey: string; valueKey: string }>;
};

export type ProductOptionValueDraft = {
  id?: string;
  key: string;
  label: string;
  swatchHex: string;
  images: string[];
  isActive: boolean;
};

export type ProductOptionDraft = {
  id?: string;
  key: string;
  label: string;
  type: ProductOptionType;
  isRequired: boolean;
  values: ProductOptionValueDraft[];
};

export type CommerceProfileDraft = {
  productKind: ProductKind;
  stitchingEligible: boolean;
  requiresSelection: boolean;
  optionLabel: string;
  sizeGuideUrl: string;
  details: Array<{ label: string; value: string }>;
  options: ProductOptionDraft[];
  variants: ProductVariantDraft[];
};

type CommerceProfilePayload = Omit<CommerceProfileDraft, "variants" | "options"> & {
  options?: Array<{
    id?: string;
    key: string;
    label: string;
    type: ProductOptionType;
    isRequired: boolean;
    values: Array<{
      id?: string;
      key: string;
      label: string;
      swatchHex?: string;
      images: string[];
      isActive: boolean;
    }>;
  }>;
  variants: Array<{
    id?: string;
    optionKey: string;
    label: string;
    sku?: string;
    priceAdjustment: number;
    stockQuantity: number;
    inStock: boolean;
    isActive: boolean;
    colorHex?: string;
    images: string[];
    selections?: Array<{ optionKey: string; valueKey: string }>;
  }>;
};

type CommerceProfileResponse = {
  productKind: ProductKind;
  stitchingEligible: boolean;
  requiresSelection: boolean;
  optionLabel?: string;
  sizeGuideUrl?: string;
  details?: Array<{ label: string; value: string }>;
  options?: ProductOptionDraft[];
  variants?: Array<{
    id: string;
    optionKey: string;
    label: string;
    sku?: string;
    priceAdjustment: number;
    stockQuantity: number;
    inStock: boolean;
    isActive: boolean;
    colorHex?: string;
    images?: string[];
    selections?: Array<{ optionKey: string; valueKey: string }>;
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
    options: [],
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
    options: Array.isArray(profile.options) ? profile.options.map((option) => ({
      ...option,
      values: option.values.map((value) => ({
        ...value,
        swatchHex: value.swatchHex || "#000000",
        images: Array.isArray(value.images) ? value.images : [],
      })),
    })) : [],
    variants: (profile.variants || []).map((variant) => ({
      id: variant.id,
      optionKey: variant.optionKey,
      label: variant.label,
      sku: variant.sku || "",
      priceAdjustment: String(variant.priceAdjustment),
      stockQuantity: String(variant.stockQuantity),
      inStock: variant.inStock,
      isActive: variant.isActive,
      colorHex: variant.colorHex || "#000000",
      images: Array.isArray(variant.images) ? variant.images : [],
      selections: variant.selections,
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
    const colorHex = variant.colorHex.trim();
    const images = variant.images.map((image) => image.trim()).filter(Boolean);

    if (!optionKey || !label) {
      throw new Error(`Option ${index + 1} needs both a key and customer label`);
    }
    if (!Number.isFinite(priceAdjustment)) {
      throw new Error(`Option ${index + 1} has an invalid price adjustment`);
    }
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      throw new Error(`Option ${index + 1} stock must be a whole number of 0 or more`);
    }
    if (draft.options.length > 0 && variant.isActive && !sku) {
      throw new Error(`Combination ${label || index + 1} needs its own SKU`);
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

    if (draft.options.length === 0 && draft.productKind === "UNSTITCHED_FABRIC") {
      if (!/^#[0-9a-f]{6}$/i.test(colorHex)) {
        throw new Error(`Color ${index + 1} needs a valid swatch color`);
      }
      if (images.length === 0) {
        throw new Error(`Color ${index + 1} needs at least one image`);
      }
    }

    return {
      ...(variant.id ? { id: variant.id } : {}),
      optionKey,
      label,
      ...(sku ? { sku } : {}),
      priceAdjustment,
      stockQuantity,
      inStock: variant.inStock,
      isActive: variant.isActive,
      ...(draft.options.length === 0 && draft.productKind === "UNSTITCHED_FABRIC" ? { colorHex, images } : { images: [] }),
      ...(draft.options.length ? { selections: variant.selections || [] } : {}),
    };
  });

  if (requiresSelection && variants.length === 0) {
    throw new Error(
      editorSchema.options.mode === "required"
        ? `Add at least one ${editorSchema.options.label.toLocaleLowerCase()} before saving this product`
        : "Add at least one option before requiring a customer selection"
    );
  }

  const optionLabel =
    draft.options.length === 0 && draft.productKind === "UNSTITCHED_FABRIC" && variants.length > 0
      ? "Color"
      : draft.optionLabel.trim();
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

  draft.options.forEach((option, axisIndex) => {
    if (!option.key.trim() || !option.label.trim() || option.values.length === 0) {
      throw new Error(`Option axis ${axisIndex + 1} needs a name and at least one value`);
    }
    option.values.forEach((value, valueIndex) => {
      if (!value.key.trim() || !value.label.trim()) {
        throw new Error(`${option.label} value ${valueIndex + 1} needs a label`);
      }
      if (option.type === "COLOR" || option.type === "SHADE") {
        if (!/^#[0-9a-f]{6}$/i.test(value.swatchHex.trim())) {
          throw new Error(`${value.label} needs a valid swatch color`);
        }
        if (value.images.length === 0) {
          throw new Error(`${value.label} needs at least one image`);
        }
      }
    });
  });

  return {
    productKind: draft.productKind,
    // Tailoring is intentionally limited to unstitched fabric. This is also
    // normalized by the protected API, so this UI value is never the only
    // enforcement point.
    stitchingEligible:
      isProductEditorFieldVisible(editorSchema.fields.stitching)
        ? draft.stitchingEligible
        : false,
    requiresSelection:
      requiresSelection ||
      (draft.productKind === "UNSTITCHED_FABRIC" && variants.length > 0),
    optionLabel,
    sizeGuideUrl,
    details,
    ...(draft.options.length ? {
      options: draft.options.map((option) => ({
        ...(option.id ? { id: option.id } : {}),
        key: option.key.trim(),
        label: option.label.trim(),
        type: option.type,
        isRequired: option.isRequired,
        values: option.values.map((value) => ({
          ...(value.id ? { id: value.id } : {}),
          key: value.key.trim(),
          label: value.label.trim(),
          swatchHex: value.swatchHex.trim() || undefined,
          images: value.images,
          isActive: value.isActive,
        })),
      })),
    } : {}),
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
    colorHex: "#000000",
    images: [],
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

function draftKey(value: string): string {
  return value.trim().toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function rebuildCombinationDrafts(
  options: ProductOptionDraft[],
  existing: ProductVariantDraft[],
): ProductVariantDraft[] {
  const combinations = options.reduce<Array<Array<{ optionKey: string; valueKey: string; label: string }>>>(
    (rows, option) => rows.flatMap((row) => option.values.filter((value) => value.isActive).map((value) => [
      ...row,
      { optionKey: option.key, valueKey: value.key, label: value.label },
    ])),
    [[]],
  ).slice(0, 300);
  const existingByCombination = new Map(existing.map((variant) => [
    (variant.selections || []).map((selection) => `${selection.optionKey}:${selection.valueKey}`).join("|"),
    variant,
  ]));
  const usedVariantIds = new Set<string>();

  return combinations.map((combination) => {
    const key = combination.map((selection) => `${selection.optionKey}:${selection.valueKey}`).join("|");
    const legacyMatch = options.length === 1
      ? existing.find((variant) => variant.optionKey === combination[0]?.valueKey)
      : undefined;
    const subsetMatch = existing.find((variant) => {
      if (variant.id && usedVariantIds.has(variant.id)) return false;
      const selections = variant.selections || [];
      return selections.length > 0 && selections.every((selection) =>
        combination.some((candidate) => candidate.optionKey === selection.optionKey && candidate.valueKey === selection.valueKey)
      );
    });
    const previous = existingByCombination.get(key) || legacyMatch || subsetMatch;
    if (previous?.id) usedVariantIds.add(previous.id);
    return {
      ...(previous || newOptionDraft()),
      optionKey: key,
      label: combination.map((selection) => selection.label).join(" / "),
      selections: combination.map(({ optionKey, valueKey }) => ({ optionKey, valueKey })),
      colorHex: "",
      images: [],
    };
  });
}

function initialNormalizedOptions(
  kind: ProductKind,
  presets: readonly ProductOptionPreset[],
): ProductOptionDraft[] {
  const values = presets.map((preset) => ({
    key: preset.optionKey,
    label: preset.label,
    swatchHex: "",
    images: [],
    isActive: true,
  }));
  if (kind === "READY_TO_WEAR" || kind === "TEENS") {
    return [{ key: "size", label: "Size", type: "SIZE", isRequired: true, values }];
  }
  if (kind === "BEAUTY") {
    return [{ key: "shade", label: "Shade", type: "SHADE", isRequired: true, values: [] }];
  }
  if (kind === "FRAGRANCE") {
    return [{ key: "volume", label: "Volume", type: "VOLUME", isRequired: true, values: [] }];
  }
  if (kind === "GIFT" || kind === "GIFT_BOX") {
    return [{ key: "format", label: "Gift option", type: "FORMAT", isRequired: true, values: [] }];
  }
  return [{ key: "color", label: "Color", type: "COLOR", isRequired: true, values: [] }];
}

function NormalizedOptionEditor({
  draft,
  update,
  onUploadVariantImage,
}: {
  draft: CommerceProfileDraft;
  update: (changes: Partial<CommerceProfileDraft>) => void;
  onUploadVariantImage?: (file: File) => Promise<string | null>;
}) {
  const updateOptions = (options: ProductOptionDraft[], variants = rebuildCombinationDrafts(options, draft.variants)) => {
    update({ options, variants, requiresSelection: options.length > 0, optionLabel: options[0]?.label || "Option" });
  };
  const updateOption = (axisIndex: number, changes: Partial<ProductOptionDraft>) => {
    updateOptions(draft.options.map((option, index) => index === axisIndex ? { ...option, ...changes } : option));
  };
  const updateValue = (axisIndex: number, valueIndex: number, changes: Partial<ProductOptionValueDraft>) => {
    const options = draft.options.map((option, index) => index === axisIndex ? {
      ...option,
      values: option.values.map((value, candidate) => candidate === valueIndex ? { ...value, ...changes } : value),
    } : option);
    updateOptions(options);
  };
  const visualAxisExists = draft.options.some((option) => option.type === "COLOR" || option.type === "SHADE");
  const canAddColor = (draft.productKind === "READY_TO_WEAR" || draft.productKind === "TEENS" || draft.productKind === "ACCESSORY") && !visualAxisExists;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Label>Variant options</Label>
          <p className="text-xs text-muted-foreground">Every matrix row below is a real SKU and inventory combination.</p>
        </div>
        {canAddColor && (
          <Button type="button" size="sm" variant="outline" onClick={() => {
            const options = [{
              key: "color",
              label: "Color",
              type: "COLOR" as const,
              isRequired: true,
              values: [{ key: "color-1", label: "", swatchHex: "#000000", images: [], isActive: true }],
            }, ...draft.options];
            updateOptions(options);
          }}><Plus className="mr-2 h-4 w-4" />Add color axis</Button>
        )}
      </div>

      {draft.options.map((option, axisIndex) => {
        const visual = option.type === "COLOR" || option.type === "SHADE";
        return (
          <div key={option.id || option.key} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.type.toLocaleLowerCase().replace("_", " ")} axis</p>
              </div>
              {canAddColor === false && visual && draft.options.length > 1 && (
                <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => updateOptions(draft.options.filter((_, index) => index !== axisIndex))}>Remove axis</Button>
              )}
            </div>
            {option.values.map((value, valueIndex) => (
              <div key={value.id || `${option.key}-${valueIndex}`} className="space-y-2 rounded-md bg-muted/30 p-3">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Input value={value.label} placeholder={visual ? option.label : `${option.label} value`} onChange={(event) => {
                    const oldKey = value.key;
                    const key = draftKey(event.target.value);
                    const variants = draft.variants.map((variant) => ({
                      ...variant,
                      selections: variant.selections?.map((selection) => selection.optionKey === option.key && selection.valueKey === oldKey ? { ...selection, valueKey: key } : selection),
                    }));
                    const options = draft.options.map((candidate, candidateAxis) => candidateAxis === axisIndex ? {
                      ...candidate,
                      values: candidate.values.map((candidateValue, candidateValueIndex) => candidateValueIndex === valueIndex ? { ...candidateValue, label: event.target.value, key } : candidateValue),
                    } : candidate);
                    updateOptions(options, rebuildCombinationDrafts(options, variants));
                  }} />
                  <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => updateOption(axisIndex, { values: option.values.filter((_, index) => index !== valueIndex) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
                {visual && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="color" value={/^#[0-9a-f]{6}$/i.test(value.swatchHex) ? value.swatchHex : "#000000"} onChange={(event) => updateValue(axisIndex, valueIndex, { swatchHex: event.target.value })} className="h-10 w-14 rounded border p-1" />
                      <Input value={value.swatchHex} onChange={(event) => updateValue(axisIndex, valueIndex, { swatchHex: event.target.value })} placeholder="#000000" className="max-w-36" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {value.images.map((url, imageIndex) => (
                        <div key={`${url}-${imageIndex}`} className="relative h-20 w-16 overflow-hidden rounded border"><Image src={url} alt="" fill sizes="64px" className="object-cover" /><button type="button" className="absolute right-1 top-1 rounded-full bg-background p-1" onClick={() => updateValue(axisIndex, valueIndex, { images: value.images.filter((_, index) => index !== imageIndex) })}><X className="h-3 w-3" /></button></div>
                      ))}
                      {value.images.length < 10 && onUploadVariantImage && <label className="flex h-20 w-16 cursor-pointer items-center justify-center rounded border-2 border-dashed"><ImagePlus className="h-4 w-4" /><input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={async (event) => { let images = [...value.images]; for (const file of Array.from(event.target.files || []).slice(0, 10 - images.length)) { const url = await onUploadVariantImage(file); if (url) images.push(url); } updateValue(axisIndex, valueIndex, { images }); event.target.value = ""; }} /></label>}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => updateOption(axisIndex, { values: [...option.values, { key: `value-${option.values.length + 1}`, label: "", swatchHex: visual ? "#000000" : "", images: [], isActive: true }] })}><Plus className="mr-2 h-4 w-4" />Add {option.label.toLocaleLowerCase()}</Button>
          </div>
        );
      })}

      <div className="space-y-2">
        <Label>Sellable combinations ({draft.variants.length})</Label>
        {draft.variants.length === 0 ? <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">Add at least one value to every option axis.</p> : draft.variants.map((variant, index) => (
          <div key={variant.id || variant.optionKey} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_8rem_8rem_auto]">
            <div className="self-center text-sm font-medium">{variant.label}</div>
            <Input aria-label={`${variant.label} SKU`} value={variant.sku} placeholder="SKU" onChange={(event) => update({ variants: draft.variants.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, sku: event.target.value } : candidate) })} />
            <Input aria-label={`${variant.label} price adjustment`} type="number" value={variant.priceAdjustment} onChange={(event) => update({ variants: draft.variants.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, priceAdjustment: event.target.value } : candidate) })} />
            <Input aria-label={`${variant.label} stock`} type="number" min="0" step="1" value={variant.stockQuantity} onChange={(event) => { const stockQuantity = event.target.value; update({ variants: draft.variants.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, stockQuantity, inStock: Number(stockQuantity) > 0 } : candidate) }); }} />
            <Checkbox aria-label={`${variant.label} active`} checked={variant.isActive} onCheckedChange={(checked) => update({ variants: draft.variants.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, isActive: checked === true } : candidate) })} />
          </div>
        ))}
      </div>
    </div>
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
  onUploadVariantImage,
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
  onUploadVariantImage?: (file: File) => Promise<string>;
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
      options: kindChanged ? [] : draft.options,
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
  const usesColorVariants = effectiveKind === "UNSTITCHED_FABRIC";
  const usesNormalizedOptions = draft.options.length > 0;

  const startNormalizedOptions = () => {
    const options = initialNormalizedOptions(effectiveKind, effectiveSchema.options.presets);
    if (options[0] && options[0].values.length === 0) {
      options[0].values.push({
        key: "value-1",
        label: "",
        swatchHex: options[0].type === "COLOR" || options[0].type === "SHADE" ? "#000000" : "",
        images: [],
        isActive: true,
      });
    }
    update({
      options,
      variants: rebuildCombinationDrafts(options, draft.variants),
      optionLabel: options[0]?.label || "Option",
      requiresSelection: true,
    });
  };

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

      {showOptions && !usesColorVariants && (
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

      {usesNormalizedOptions ? (
        <NormalizedOptionEditor
          draft={draft}
          update={update}
          onUploadVariantImage={onUploadVariantImage}
        />
      ) : effectiveKind === "BEAUTY" && effectiveSchema.fields.color.mode === "hidden" ? (
        <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          This beauty category does not use shade variants. Skincare remains a single purchasable product.
        </p>
      ) : !showOptions || draft.variants.length === 0 ? (
        <Button
          type="button"
          variant="outline"
          onClick={startNormalizedOptions}
        >
          <Plus className="mr-2 h-4 w-4" />
          {effectiveKind === "READY_TO_WEAR" || effectiveKind === "TEENS"
            ? "Create size combinations"
            : usesColorVariants
              ? "This product has multiple colors"
              : "This product has options"}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Label>{usesColorVariants ? "Colors" : (draft.optionLabel || "Options")}</Label>
              <p className="text-xs text-muted-foreground">
                {usesColorVariants
                  ? "Each color has its own gallery, SKU, stock, and price adjustment."
                  : "Each option can have its own SKU, stock, and price adjustment."}
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
                onClick={() => update({
                  optionLabel: usesColorVariants ? "Color" : draft.optionLabel,
                  requiresSelection: usesColorVariants ? true : draft.requiresSelection,
                  variants: [...draft.variants, newOptionDraft()],
                })}
                disabled={draft.variants.length >= 50}
              >
                <Plus className="mr-2 h-4 w-4" />
                {usesColorVariants ? "Add color" : "Add option"}
              </Button>
            </div>
          </div>

          {draft.variants.map((variant, index) => (
            <div key={variant.id || `new-option-${index}`} className="space-y-3 rounded-md border p-3">
              <div className="space-y-1">
                <Label htmlFor={`commerce-option-label-${index}`}>
                  {usesColorVariants ? "Color name" : `${draft.optionLabel || "Option"} label`}
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
            {usesColorVariants && (
              <div className="space-y-3 rounded-md bg-muted/30 p-3">
                <div className="space-y-1">
                  <Label htmlFor={`commerce-option-color-${index}`}>Swatch color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id={`commerce-option-color-${index}`}
                      type="color"
                      value={/^#[0-9a-f]{6}$/i.test(variant.colorHex) ? variant.colorHex : "#000000"}
                      onChange={(event) => updateVariant(index, { colorHex: event.target.value })}
                      className="h-10 w-14 cursor-pointer rounded border p-1"
                    />
                    <Input
                      aria-label={`Color ${index + 1} hex value`}
                      value={variant.colorHex}
                      onChange={(event) => updateVariant(index, { colorHex: event.target.value })}
                      placeholder="#000000"
                      className="max-w-36"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Color gallery (1–10 images)</Label>
                  <div className="flex flex-wrap gap-2">
                    {variant.images.map((image, imageIndex) => (
                      <div key={`${image}-${imageIndex}`} className="relative h-24 w-20 overflow-hidden rounded-md border bg-background">
                        <Image src={image} alt={`${variant.label || `Color ${index + 1}`} image ${imageIndex + 1}`} fill sizes="80px" className="object-cover" />
                        <button
                          type="button"
                          aria-label={`Remove image ${imageIndex + 1} from ${variant.label || `color ${index + 1}`}`}
                          onClick={() => updateVariant(index, { images: variant.images.filter((_, candidate) => candidate !== imageIndex) })}
                          className="absolute right-1 top-1 rounded-full bg-background/90 p-1 shadow"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {variant.images.length < 10 && onUploadVariantImage && (
                      <label className="flex h-24 w-20 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed text-center text-xs text-muted-foreground hover:border-primary hover:text-foreground">
                        <ImagePlus className="mb-1 h-4 w-4" />
                        Add images
                        <input
                          className="sr-only"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={async (event) => {
                            const files = Array.from(event.target.files || []).slice(0, 10 - variant.images.length);
                            let images = [...variant.images];
                            for (const file of files) {
                              const url = await onUploadVariantImage(file);
                              if (url) images = [...images, url].slice(0, 10);
                            }
                            updateVariant(index, { images });
                            event.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                  {variant.images.length === 0 && (
                    <p className="text-xs text-amber-700">Add at least one image for this color.</p>
                  )}
                </div>
              </div>
            )}
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
                onClick={() => {
                  const variants = draft.variants.filter((_, variantIndex) => variantIndex !== index);
                  update({
                    variants,
                    ...(usesColorVariants && variants.length === 0
                      ? {
                          requiresSelection: false,
                          optionLabel: defaultOptionLabelForKind("UNSTITCHED_FABRIC"),
                        }
                      : {}),
                  });
                }}
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
