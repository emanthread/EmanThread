export const CATALOG_BANNER_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const CATALOG_BANNER_MAX_BYTES = 10 * 1024 * 1024;
export const CATALOG_BANNER_MIN_WIDTH = 1_200;
export const CATALOG_BANNER_MIN_HEIGHT = 300;
export const CATALOG_BANNER_MIN_ASPECT_RATIO = 3;
export const CATALOG_BANNER_MAX_ASPECT_RATIO = 4;

interface CatalogBannerFileLike {
  type: string;
  size: number;
}

export function isAllowedCatalogBannerImage(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true;

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "res.cloudinary.com" ||
        url.hostname === "images.unsplash.com")
    );
  } catch {
    return false;
  }
}

export function catalogBannerFileError(
  file: CatalogBannerFileLike
): string | null {
  if (
    !CATALOG_BANNER_ACCEPTED_TYPES.includes(
      file.type as (typeof CATALOG_BANNER_ACCEPTED_TYPES)[number]
    )
  ) {
    return "Use a JPEG, PNG, or WebP image";
  }
  if (file.size > CATALOG_BANNER_MAX_BYTES) {
    return "Banner images must be 10 MB or smaller";
  }
  return null;
}

export function catalogBannerDimensionsError(
  width: number,
  height: number
): string | null {
  if (width < CATALOG_BANNER_MIN_WIDTH || height < CATALOG_BANNER_MIN_HEIGHT) {
    return `Banner images must be at least ${CATALOG_BANNER_MIN_WIDTH} × ${CATALOG_BANNER_MIN_HEIGHT}px`;
  }

  const aspectRatio = width / height;
  if (
    aspectRatio < CATALOG_BANNER_MIN_ASPECT_RATIO ||
    aspectRatio > CATALOG_BANNER_MAX_ASPECT_RATIO
  ) {
    return "Use a wide banner with an aspect ratio between 3:1 and 4:1";
  }
  return null;
}
