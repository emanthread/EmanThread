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
