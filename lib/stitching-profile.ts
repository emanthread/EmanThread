import { DEFAULT_STITCHING_FEE } from "@/lib/feature-flags";
import {
  getStitchingPriceGender,
  getStitchingPriceLookupKeys,
  resolveStitchingPriceKey,
} from "@/lib/stitching-price";

export interface MeasurementProfileSummary {
  id: string;
  profileName: string;
  isDefault: boolean;
  gender: string;
  garmentType: string;
  source?: string;
}

export type GroupedStitchingPrices = {
  male?: Record<string, number>;
  female?: Record<string, number>;
};

/** Browser estimate only; order creation performs the authoritative lookup. */
export function getProfileStitchingPrice(
  profile: Pick<MeasurementProfileSummary, "garmentType" | "gender">,
  prices: GroupedStitchingPrices,
): number {
  const priceKey = resolveStitchingPriceKey(profile.garmentType);
  if (!priceKey) return DEFAULT_STITCHING_FEE;

  const gender = getStitchingPriceGender(profile.garmentType, profile.gender).toLowerCase() as
    | "male"
    | "female";
  const priceBucket = prices[gender] ?? {};
  for (const lookupKey of getStitchingPriceLookupKeys(profile.garmentType, priceKey)) {
    const configured = priceBucket[lookupKey.toLowerCase()];
    if (typeof configured === "number" && Number.isFinite(configured)) return configured;
  }
  return DEFAULT_STITCHING_FEE;
}
