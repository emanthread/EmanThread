export const CATALOG_BANNER_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const CATALOG_BANNER_MAX_BYTES = 10 * 1024 * 1024;

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
