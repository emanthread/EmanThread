import type {
  Product,
  ProductCommerceDetail,
  ProductCommerceProfile,
  ProductKind,
  ProductOption,
  ProductOptionType,
  ProductVariant,
} from "@/lib/data";
import {
  PRODUCT_KIND_OPTIONS,
  classifyCatalogPath,
  isProductEditorFieldVisible,
  productEditorSchemaForKind,
} from "@/lib/catalog-product-classification";

export const PRODUCT_KINDS: Array<{ value: ProductKind; label: string }> =
  PRODUCT_KIND_OPTIONS.map((item) => ({ ...item }));

export const PRODUCT_KIND_VALUES = PRODUCT_KINDS.map((kind) => kind.value) as [
  ProductKind,
  ...ProductKind[],
];

/**
 * These merchandise kinds are sold against a concrete size/option. Keep the
 * rule in one place so older profiles cannot accidentally re-enable a generic
 * product line by carrying a stale `requiresSelection: false` value.
 */
export function productKindRequiresSelection(kind: ProductKind | null | undefined): boolean {
  return Boolean(
    kind && productEditorSchemaForKind(kind).options.mode === "required"
  );
}

export type ProductOptionSelection = {
  label: string;
  value: string;
};

export type CartVariantSnapshot = {
  id: string;
  label: string;
  sku?: string;
  priceAdjustment: number;
};

export function defaultCommerceProfile(): ProductCommerceProfile {
  return {
    productKind: "UNSTITCHED_FABRIC",
    stitchingEligible: true,
    requiresSelection: false,
    details: [],
    variants: [],
  };
}

export function getProductCommerce(product: Product): ProductCommerceProfile {
  return product.commerce ?? defaultCommerceProfile();
}

export function isUnstitchedCatalogPath(path: string): boolean {
  return (
    classifyCatalogPath(path)?.productKind === "UNSTITCHED_FABRIC" ||
    /(?:^|\/)unstitched(?:[-/]|$)/i.test(path.trim())
  );
}

export function hasOnlyUnstitchedCatalogPaths(
  catalogPaths: readonly string[] | undefined,
): boolean {
  return Boolean(
    catalogPaths?.length && catalogPaths.every(isUnstitchedCatalogPath),
  );
}

/**
 * Catalog assignment is the repair source for older products whose generated
 * commerce profile was accidentally saved as ready-to-wear. Requiring every
 * known placement to be unstitched prevents a promotional placement from
 * changing a genuine ready-to-wear product's purchase rules.
 */
export function isEffectivelyUnstitchedProduct(product: Product): boolean {
  return (
    product.commerce?.productKind === "UNSTITCHED_FABRIC" ||
    hasOnlyUnstitchedCatalogPaths(product.catalogPaths)
  );
}

/**
 * Phase-one color products are explicit unstitched commerce profiles. Their
 * concrete SKU rows carry color metadata. Stale ready-to-wear size profiles
 * repaired by catalog placement must never be mistaken for color choices.
 */
export function isUnstitchedColorVariantProduct(product: Product): boolean {
  return Boolean(
    isEffectivelyUnstitchedProduct(product) &&
    product.commerce?.productKind === "UNSTITCHED_FABRIC" &&
    (product.commerce.options?.some((option) => option.type === "COLOR") ||
      product.commerce.optionLabel?.trim().toLocaleLowerCase("en-US") === "color")
  );
}

function legacyOptionType(product: Product): ProductOptionType {
  const label = product.commerce?.optionLabel?.toLocaleLowerCase("en-US") || "";
  if (label.includes("color")) return "COLOR";
  if (label.includes("shade")) return "SHADE";
  if (label.includes("size")) return "SIZE";
  if (label.includes("volume")) return "VOLUME";
  return "CUSTOM";
}

/** Normalized axes with an in-memory adapter for pre-migration payloads. */
export function getProductOptions(product: Product): ProductOption[] {
  const commerce = product.commerce;
  if (!commerce) return [];
  if (commerce.options?.length) return commerce.options;
  if (!commerce.variants.length) return [];

  const label = commerce.optionLabel?.trim() || "Option";
  const type = legacyOptionType(product);
  return [{
    id: `legacy:${product.id}:${label.toLocaleLowerCase("en-US")}`,
    key: label.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "option",
    label,
    type,
    isRequired: commerce.requiresSelection,
    displayOrder: 0,
    values: commerce.variants.map((variant, displayOrder) => ({
      id: `legacy:${variant.id}`,
      key: variant.optionKey,
      label: variant.label,
      swatchHex: variant.colorHex,
      images: variant.images,
      isActive: variant.isActive,
      displayOrder,
    })),
  }];
}

export function getVariantSelections(product: Product, variant: ProductVariant) {
  if (variant.selections?.length) {
    const order = new Map(getProductOptions(product).map((option, index) => [option.id, index]));
    return [...variant.selections].sort(
      (left, right) => (order.get(left.optionId) ?? 999) - (order.get(right.optionId) ?? 999),
    );
  }

  const option = getProductOptions(product)[0];
  if (!option) return [];
  const value = option.values.find((candidate) =>
    candidate.key === variant.optionKey || candidate.label === variant.label
  );
  return value ? [{
    optionId: option.id,
    optionKey: option.key,
    optionLabel: option.label,
    optionType: option.type,
    valueId: value.id,
    valueKey: value.key,
    valueLabel: value.label,
  }] : [];
}

export function productOptionsForVariant(
  product: Product,
  variant: ProductVariant,
): ProductOptionSelection[] {
  const selections = getVariantSelections(product, variant);
  return selections.length
    ? selections.map((selection) => ({
        label: selection.optionLabel,
        value: selection.valueLabel,
      }))
    : [{
        label: getProductCommerce(product).optionLabel?.trim() || "Option",
        value: variant.label,
      }];
}

export function getVisualValueForVariant(product: Product, variant: ProductVariant) {
  const visualSelection = getVariantSelections(product, variant).find(
    (selection) => selection.optionType === "COLOR" || selection.optionType === "SHADE",
  );
  if (!visualSelection) return undefined;
  return getProductOptions(product)
    .find((option) => option.id === visualSelection.optionId)
    ?.values.find((value) => value.id === visualSelection.valueId);
}

export function getVariantImages(product: Product, variant: ProductVariant): string[] {
  return variant.images?.length
    ? variant.images
    : getVisualValueForVariant(product, variant)?.images?.length
      ? getVisualValueForVariant(product, variant)!.images!
      : product.images;
}

export function getActiveVariants(product: Product): ProductVariant[] {
  if (isEffectivelyUnstitchedProduct(product) && !isUnstitchedColorVariantProduct(product)) {
    return [];
  }
  return getProductCommerce(product).variants.filter((variant) => variant.isActive);
}

export function isVariantAvailable(variant: ProductVariant): boolean {
  return variant.isActive && variant.inStock && variant.stockQuantity > 0;
}

export function requiresProductSelection(product: Product): boolean {
  if (isUnstitchedColorVariantProduct(product)) return true;
  if (isEffectivelyUnstitchedProduct(product)) return false;
  // A required profile remains required even if an admin has temporarily
  // deactivated every option. This lets the storefront show an honest
  // unavailable state instead of adding an impossible line to the cart.
  return Boolean(
    product.commerce && (
      product.commerce.requiresSelection ||
      productKindRequiresSelection(product.commerce.productKind)
    ),
  );
}

/**
 * The profile's variants become the availability source when present. Products
 * without an additive profile intentionally keep their legacy `inStock` rule.
 */
export function isProductAvailableForPurchase(product: Product): boolean {
  if (!product.commerce) return product.inStock;

  const activeVariants = getActiveVariants(product);
  const hasAvailableVariant = activeVariants.some(isVariantAvailable);
  const parentStockAvailable = product.inStock && (
    product.stockQuantity === undefined || product.stockQuantity > 0
  );

  if (requiresProductSelection(product)) {
    return hasAvailableVariant;
  }

  // Optional variants may be chosen (for a different size/volume/format),
  // while a profile with no active variants can still use the legacy product
  // stock as its generic purchasable line.
  return hasAvailableVariant || parentStockAvailable;
}

/**
 * When the parent product is intentionally unavailable but a variant is in
 * stock, the shopper must choose that variant rather than creating a legacy
 * product-stock line that the order API would reject.
 */
export function requiresVariantSelectionForPurchase(product: Product): boolean {
  if (!product.commerce) return false;
  const activeVariants = getActiveVariants(product);
  const parentStockAvailable = product.inStock && (
    product.stockQuantity === undefined || product.stockQuantity > 0
  );
  return requiresProductSelection(product) || (activeVariants.length > 0 && !parentStockAvailable);
}

export function hasUnavailableRequiredSelection(product: Product): boolean {
  return Boolean(
    requiresProductSelection(product) && !getActiveVariants(product).some(isVariantAvailable),
  );
}

const NON_STITCHING_CATALOG_PATH_MARKERS = [
  "/ready-to-wear",
  "/fragrance-beauty",
  "/fragrance",
  "/beauty",
  "/teens",
  "/gift",
] as const;

/**
 * Catalog placement is a safety fallback while the live store transitions
 * existing products into explicit commerce profiles. It deliberately uses
 * the new catalog path, never the legacy categoryId/fabricType fields, which
 * remain compatibility metadata for the old fabric-first listing.
 */
export function catalogPlacementBlocksStitching(
  catalogPaths: readonly string[] | undefined
): boolean {
  if (hasOnlyUnstitchedCatalogPaths(catalogPaths)) return false;
  return Boolean(
    catalogPaths?.some((path) => {
      const normalized = path.toLocaleLowerCase("en-US");
      return NON_STITCHING_CATALOG_PATH_MARKERS.some((marker) =>
        normalized.includes(marker)
      );
    })
  );
}

/**
 * Missing metadata retains the live legacy fabric flow. Once a commerce
 * profile exists, stitching is only valid for unstitched fabric; the explicit
 * boolean remains a second safety gate. During the catalog rollout, a product
 * in an explicitly non-stitchable catalog branch is also protected even if an
 * older record has not yet received its commerce profile.
 */
export function isProductStitchingEligible(product: Product): boolean {
  const commerce = product.commerce;
  if (isEffectivelyUnstitchedProduct(product)) {
    // Respect an intentional opt-out on correctly classified fabric. A stale
    // ready-to-wear profile is repaired by its all-unstitched assignments.
    return commerce?.productKind === "UNSTITCHED_FABRIC"
      ? commerce.stitchingEligible
      : true;
  }
  if (commerce) {
    return (
      isProductEditorFieldVisible(
        productEditorSchemaForKind(commerce.productKind).fields.stitching
      ) && commerce.stitchingEligible
    );
  }
  
  const blockKeywords = ["women", "fragrance", "beauty", "teens", "perfume", "makeup", "gift", "ready to wear", "ready-to-wear"];
  const checkString = (str?: string) => {
    if (!str) return false;
    const lower = str.toLowerCase();
    return blockKeywords.some(keyword => lower.includes(keyword));
  };

  if (checkString(product.categoryName) || checkString(product.fabricType)) {
    return false;
  }

  return !catalogPlacementBlocksStitching(product.catalogPaths);
}

export function getVariantUnitPrice(product: Product, variant?: ProductVariant | null): number {
  return product.price + (variant?.priceAdjustment ?? 0);
}

export function productOptionForVariant(
  product: Product,
  variant: ProductVariant
): ProductOptionSelection {
  return productOptionsForVariant(product, variant)[0];
}

export function productKindLabel(kind: ProductKind): string {
  return PRODUCT_KINDS.find((item) => item.value === kind)?.label ?? kind;
}

export function normalizeCommerceDetails(value: unknown): ProductCommerceDetail[] {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const record = item as Record<string, unknown>;
      const label = typeof record.label === "string" ? record.label.trim().slice(0, 80) : "";
      const detailValue = typeof record.value === "string" ? record.value.trim().slice(0, 500) : "";
      return label && detailValue ? [{ label, value: detailValue }] : [];
    })
    .slice(0, 12);
}
