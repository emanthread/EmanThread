import type { ProductKind } from "@/lib/data";

export const CATALOG_PRICE_MIN = 0;
export const CATALOG_PRICE_MAX = 10_000;
export const CATALOG_PRICE_STEP = 500;

export const CATALOG_SEASON_OPTIONS = [
  "Summer",
  "Winter",
  "Eid",
  "Festive",
  "All Season",
  "Casual",
  "Formal",
  "Wedding",
] as const;

const CLOTHING_PRODUCT_KINDS = new Set<ProductKind>([
  "UNSTITCHED_FABRIC",
  "READY_TO_WEAR",
  "TEENS",
]);

const COLORLESS_PRODUCT_KINDS = new Set<ProductKind>([
  "FRAGRANCE",
  "GIFT",
  "GIFT_BOX",
  "ACCESSORY",
]);

const OPTIONLESS_PRODUCT_KINDS = new Set<ProductKind>([
  "GIFT",
  "GIFT_BOX",
]);

function catalogPathSegments(catalogPath: string): string[] {
  return catalogPath
    .toLocaleLowerCase("en-US")
    .split("/")
    .filter(Boolean);
}

function isGiftPath(segments: readonly string[]): boolean {
  return segments.some((segment) => segment.includes("gift"));
}

/**
 * Department landings may aggregate several clothing types, while a deeply
 * nested fragrance or beauty node should not inherit apparel-only filters.
 */
export function supportsSeasonFilter(
  catalogPath: string,
  productKinds: readonly ProductKind[]
): boolean {
  const department = catalogPath.split("/")[1];
  if (!department || department === "fragrance-beauty") return false;
  if (!["women", "men", "teens"].includes(department)) return false;

  return (
    productKinds.length === 0 ||
    productKinds.some((kind) => CLOTHING_PRODUCT_KINDS.has(kind))
  );
}

/**
 * Color is a merchandising attribute for clothing and makeup, not every
 * catalog product. Use node metadata whenever it is specific, while keeping
 * the remaining beauty subtypes explicit until they have distinct metadata.
 */
export function supportsColorFilter(
  catalogPath: string,
  productKind?: ProductKind | null
): boolean {
  const segments = catalogPathSegments(catalogPath);
  const [department, section, subsection] = segments;

  if (isGiftPath(segments) || (productKind && COLORLESS_PRODUCT_KINDS.has(productKind))) {
    return false;
  }

  if (department !== "fragrance-beauty") return true;

  // Department landings intentionally remain data-driven because they mix
  // fragrance, makeup, and skincare products.
  if (section === "fragrances" || section === "skincare" || section === "new-in") {
    return false;
  }

  return !(section === "makeup" && subsection === "accessories");
}

/** Gift collections do not have a meaningful size, volume, or shade option. */
export function supportsOptionsFilter(
  catalogPath: string,
  productKind?: ProductKind | null
): boolean {
  const segments = catalogPathSegments(catalogPath);
  return !isGiftPath(segments) && !(
    productKind && OPTIONLESS_PRODUCT_KINDS.has(productKind)
  );
}

export function colorFilterCopy(catalogPath: string): {
  label: "Color" | "Shade";
  allLabel: "All colors" | "All shades";
} {
  const [, section, subsection] = catalogPathSegments(catalogPath);
  const isMakeup = section === "makeup" && subsection !== "accessories";

  return isMakeup
    ? { label: "Shade", allLabel: "All shades" }
    : { label: "Color", allLabel: "All colors" };
}
