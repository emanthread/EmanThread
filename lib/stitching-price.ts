/**
 * Canonical stitching price keys. These keys intentionally match the existing
 * `StitchingPrice.fabricType` records so both checkout UI and order creation
 * make the same garment/variant decision.
 */

export type StitchingPriceGender = "Male" | "Female";

export type StitchingVariantOption = {
  key: string;
  label: string;
};

export const STITCHING_GARMENT_VARIANTS: Record<string, readonly StitchingVariantOption[]> = {
  male_shalwar_kameez: [
    { key: "shalwar_kameez_simple_shalwar", label: "With Simple Shalwar" },
    { key: "shalwar_kameez_trouser", label: "With Trouser" },
  ],
  female_simple_shalwar: [
    { key: "female_shalwar_kameez_simple_shalwar", label: "With Simple Shalwar" },
    { key: "female_shalwar_kameez_trouser", label: "With Trouser" },
    { key: "female_shalwar_kameez_belt_shalwar", label: "With Belt Shalwar" },
  ],
};

const FIXED_STITCHING_PRICE_KEYS: Record<string, string> = {
  male_simple_3_piece: "simple 3 piece suit",
  male_prince_coat: "prince coat 3 piece suit",
  male_shirt: "shirt",
  female_frock: "frock",
  female_lehnga_kurti: "lehnga kurti",
  female_saari: "saari",
};

// Older live configurations used one shared Shalwar Kameez record before
// per-variant keys were introduced. It remains a lookup fallback only: the
// selected canonical key is still validated and stored on the order.
const LEGACY_PRICE_KEY_FALLBACKS: Record<string, readonly string[]> = {
  male_shalwar_kameez: ["shalwar kameez"],
  female_simple_shalwar: ["shalwar kameez"],
};

export function normalizeStitchingPriceKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeGarmentType(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Returns the only valid price keys for a measurement garment type. Unknown
 * legacy garment types can still use their own exact key, but cannot select a
 * key for a different garment type.
 */
export function getAllowedStitchingPriceKeys(garmentType: string): readonly string[] {
  const normalizedGarmentType = normalizeGarmentType(garmentType);
  const variants = STITCHING_GARMENT_VARIANTS[normalizedGarmentType];
  if (variants) return variants.map((variant) => variant.key);

  const fixedKey = FIXED_STITCHING_PRICE_KEYS[normalizedGarmentType];
  if (fixedKey) return [fixedKey];

  return normalizedGarmentType ? [normalizedGarmentType] : [];
}

/**
 * Resolves a browser-requested variant to an allowed canonical price key.
 * If no variant is supplied, the first configured garment option is the
 * backwards-compatible default.
 */
export function resolveStitchingPriceKey(
  garmentType: string,
  requestedPriceKey?: string | null,
): string | null {
  const allowedKeys = getAllowedStitchingPriceKeys(garmentType);
  if (!allowedKeys.length) return null;

  const candidate = requestedPriceKey
    ? normalizeStitchingPriceKey(requestedPriceKey)
    : normalizeStitchingPriceKey(allowedKeys[0]);

  return allowedKeys.find(
    (allowedKey) => normalizeStitchingPriceKey(allowedKey) === candidate,
  ) ?? null;
}

/**
 * Resolves pricing from the selected canonical key first, then from any
 * existing legacy configuration for the same garment type.
 */
export function getStitchingPriceLookupKeys(
  garmentType: string,
  priceKey: string,
): readonly string[] {
  const normalizedPriceKey = normalizeStitchingPriceKey(priceKey);
  const fallbacks = LEGACY_PRICE_KEY_FALLBACKS[normalizeGarmentType(garmentType)] ?? [];

  return [
    normalizedPriceKey,
    ...fallbacks
      .map(normalizeStitchingPriceKey)
      .filter((fallback) => fallback !== normalizedPriceKey),
  ];
}

/** The canonical gender bucket used by the existing StitchingPrice table. */
export function getStitchingPriceGender(
  garmentType: string,
  reportedGender?: string | null,
): StitchingPriceGender {
  const normalizedGarmentType = normalizeGarmentType(garmentType);
  if (normalizedGarmentType.startsWith("female_")) return "Female";
  if (normalizedGarmentType.startsWith("male_")) return "Male";
  return reportedGender?.trim().toLowerCase() === "female" ? "Female" : "Male";
}

/** Produces the server-owned variant label stored with an order snapshot. */
export function getStitchingVariantLabel(
  garmentType: string,
  priceKey: string,
): string | undefined {
  const variants = STITCHING_GARMENT_VARIANTS[normalizeGarmentType(garmentType)];
  return variants?.find(
    (variant) => normalizeStitchingPriceKey(variant.key) === normalizeStitchingPriceKey(priceKey),
  )?.label;
}
