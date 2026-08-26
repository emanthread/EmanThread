export interface ShippingZoneCandidate {
  id: string;
  name: string;
  cities: string[];
  provinces: string[];
  shippingRate: number;
  estimatedDays: string;
}

export function normalizeShippingLocation(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Resolve a zone deterministically: exact city, province-wide, then default.
 * A zone that lists cities is never also treated as a province-wide catch-all.
 */
export function selectShippingZone(
  zones: ShippingZoneCandidate[],
  city: string,
  province: string,
): ShippingZoneCandidate | null {
  const normalizedCity = normalizeShippingLocation(city);
  const normalizedProvince = normalizeShippingLocation(province);

  const exactCity = zones.find((zone) =>
    zone.cities.some((candidate) => normalizeShippingLocation(candidate) === normalizedCity)
  );
  if (exactCity) return exactCity;

  const provinceWide = zones.find((zone) =>
    zone.cities.length === 0 &&
    zone.provinces.some(
      (candidate) => normalizeShippingLocation(candidate) === normalizedProvince,
    )
  );
  if (provinceWide) return provinceWide;

  return zones.find(
    (zone) => zone.cities.length === 0 && zone.provinces.length === 0,
  ) ?? null;
}

export function calculateShippingCost(input: {
  subtotal: number;
  baseRate: number;
  enableFreeShipping: boolean;
  freeShippingThreshold: number;
}) {
  const qualifiesForFreeShipping =
    input.enableFreeShipping &&
    input.freeShippingThreshold > 0 &&
    input.subtotal >= input.freeShippingThreshold;

  return {
    shippingCost: qualifiesForFreeShipping ? 0 : Math.max(0, input.baseRate),
    freeShippingApplied: qualifiesForFreeShipping,
  };
}
