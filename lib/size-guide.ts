import type { Product } from "@/lib/data";

export type SizeGuideTemplateKey =
  | "mens-shirt"
  | "mens-suit"
  | "waistcoat"
  | "womens-readywear";

export type SizeGuideTemplate = {
  key: SizeGuideTemplateKey;
  title: string;
  description: string;
};

export const SIZE_GUIDE_TEMPLATES: SizeGuideTemplate[] = [
  {
    key: "mens-shirt",
    title: "Men's shirt / kurta",
    description: "Finished garment measurements in inches.",
  },
  {
    key: "mens-suit",
    title: "Men's coat & pant set",
    description: "Finished garment measurements in inches.",
  },
  {
    key: "waistcoat",
    title: "Waistcoat",
    description: "Guard-fit finished garment measurements in inches.",
  },
  {
    key: "womens-readywear",
    title: "Women's ready-to-wear",
    description: "Finished garment measurements in inches.",
  },
];

export function getSizeGuideTemplate(
  key: SizeGuideTemplateKey
): SizeGuideTemplate {
  return SIZE_GUIDE_TEMPLATES.find((template) => template.key === key)!;
}

function productGuideSearchText(product: Product): string {
  return [
    product.name,
    product.description,
    product.longDescription,
    ...(product.tags || []),
    ...(product.catalogPaths || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("en-US");
}

/**
 * Default charts are deliberately conservative. A wrong size chart is worse
 * than no chart, so only products with an explicit ready-to-wear profile and
 * a recognisable garment/category use a bundled template. Admin-configured
 * sizeGuideUrl values remain the escape hatch for every other product.
 */
export function resolveProductSizeGuideTemplate(
  product: Product
): SizeGuideTemplateKey | null {
  if (product.commerce?.productKind !== "READY_TO_WEAR") return null;

  const text = productGuideSearchText(product);
  if (product.catalogPaths?.some((path) => path.startsWith("/women"))) {
    return "womens-readywear";
  }
  if (/\bwaistcoat\b/.test(text)) return "waistcoat";
  if (/\b(?:pant|pent)\s*coat\b|\b(?:two|three|2|3)[ -]?piece\b|\bsuit\b/.test(text)) {
    return "mens-suit";
  }
  if (/\bshirt\b|\bkurta\b|\bkameez\b/.test(text)) return "mens-shirt";

  return null;
}

export function hasProductSizeGuide(product: Product): boolean {
  return Boolean(
    product.commerce?.sizeGuideUrl?.trim() ||
      resolveProductSizeGuideTemplate(product)
  );
}

export function isImageSizeGuideUrl(value: string): boolean {
  return /\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(value);
}
