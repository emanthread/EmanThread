import type {
  Product,
  ProductCommerceDetail,
  ProductCommerceProfile,
  ProductKind,
  ProductVariant,
} from "@/lib/data";

export const PRODUCT_KINDS: Array<{ value: ProductKind; label: string }> = [
  { value: "UNSTITCHED_FABRIC", label: "Unstitched fabric" },
  { value: "READY_TO_WEAR", label: "Ready to wear" },
  { value: "FRAGRANCE", label: "Fragrance" },
  { value: "BEAUTY", label: "Beauty" },
  { value: "TEENS", label: "Teens / kids" },
  { value: "GIFT", label: "Gift" },
  { value: "GIFT_BOX", label: "Gift box" },
  { value: "ACCESSORY", label: "Accessory" },
];

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
  return kind === "READY_TO_WEAR" || kind === "TEENS";
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

export function getActiveVariants(product: Product): ProductVariant[] {
  return getProductCommerce(product).variants.filter((variant) => variant.isActive);
}

export function isVariantAvailable(variant: ProductVariant): boolean {
  return variant.isActive && variant.inStock && variant.stockQuantity > 0;
}

export function requiresProductSelection(product: Product): boolean {
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
  if (commerce) {
    return (
      commerce.productKind === "UNSTITCHED_FABRIC" && commerce.stitchingEligible
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
  const commerce = getProductCommerce(product);
  return {
    label: commerce.optionLabel?.trim() || "Option",
    value: variant.label,
  };
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
