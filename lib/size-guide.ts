import type { Product } from "@/lib/data";

export const KIDS_SIZE_GUIDE_URL = "/size-guides/kids-size-guide.pdf";

export type SizeGuideTemplateKey =
  | "mens-shirt"
  | "mens-shalwar-kameez"
  | "mens-suit"
  | "pent-coat"
  | "waistcoat"
  | "womens-readywear"
  | "kids";

export type SizeGuideTemplate = {
  key: SizeGuideTemplateKey;
  title: string;
  description: string;
};

export const SIZE_GUIDE_TEMPLATES: SizeGuideTemplate[] = [
  {
    key: "mens-shirt",
    title: "Men's shirt",
    description: "Finished garment measurements in inches.",
  },
  {
    key: "mens-shalwar-kameez",
    title: "Men's shalwar kameez",
    description: "Finished garment measurements in inches.",
  },
  {
    key: "mens-suit",
    title: "Men's coat & pant set",
    description: "Finished garment measurements in inches.",
  },
  {
    key: "pent-coat",
    title: "Pent coat",
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
  {
    key: "kids",
    title: "Kids / Teens ready-to-wear",
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
    product.categoryName,
    ...(product.tags || []),
    ...(product.catalogPaths || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("en-US");
}

function productCatalogPaths(product: Product): string[] {
  return (product.catalogPaths || [])
    .map((path) => path.trim().toLocaleLowerCase("en-US").replace(/\/+$/, ""))
    .filter(Boolean)
    .map((path) => (path.startsWith("/") ? path : `/${path}`));
}

function hasCatalogPath(paths: string[], pattern: RegExp): boolean {
  return paths.some((path) => pattern.test(path));
}

/**
 * Bundled charts are resolved from the product's assigned catalog path before
 * considering its name. This keeps a chart tied to the actual department and
 * subcategory selected in Admin, rather than guessing from marketing copy.
 *
 * A wrong size chart is worse than no chart. Fragrance, beauty, gifts, and unstitched
 * fabric deliberately receive no bundled chart. Admin's product-specific
 * sizeGuideUrl remains available for every supported product.
 */
export function resolveProductSizeGuideTemplates(
  product: Product
): SizeGuideTemplateKey[] {
  if (product.commerce?.productKind === "TEENS") return ["kids"];

  const paths = productCatalogPaths(product);
  if (hasCatalogPath(paths, /^\/teens(?:\/|$)/) || hasCatalogPath(paths, /^\/kids(?:\/|$)/)) {
    return ["kids"];
  }

  if (product.commerce?.productKind !== "READY_TO_WEAR") return [];

  // Check combined garments first: this product needs both relevant charts.
  if (hasCatalogPath(paths, /\/kameez-shalwar-waistcoat(?:\/|$)/)) {
    return ["mens-shalwar-kameez", "waistcoat"];
  }

  if (hasCatalogPath(paths, /\/waistcoat(?:\/|$)/)) return ["waistcoat"];
  if (hasCatalogPath(paths, /\/(?:pent|pant)-coat(?:\/|$)/)) return ["pent-coat"];
  if (hasCatalogPath(paths, /\/men(?:\/|$).*\/(?:suit|coat-and-pant)(?:\/|$)/)) {
    return ["mens-suit"];
  }

  if (
    hasCatalogPath(
      paths,
      /^\/men(?:\/|$).*\/(?:kameez-shalwar(?:-collection)?|kurta(?:-trousers|-collection)?)(?:\/|$)/
    )
  ) {
    return ["mens-shalwar-kameez"];
  }

  if (hasCatalogPath(paths, /\/men(?:\/|$).*\/shirt(?:\/|$)/)) {
    return ["mens-shirt"];
  }

  if (
    hasCatalogPath(paths, /^\/women\/ready-to-wear(?:\/|$)/) ||
    hasCatalogPath(paths, /^\/women\/formals\/rtw-(?:2|3)-piece(?:\/|$)/)
  ) {
    return ["womens-readywear"];
  }

  // Legacy products may not yet have a catalog assignment. Use a deliberately
  // narrow name/category fallback for those records only.
  const text = productGuideSearchText(product);
  if (/\b(?:kids|teen|teens|boy|boys|girl|girls)\b/.test(text)) return ["kids"];
  if (/\bwaistcoat\b/.test(text)) return ["waistcoat"];
  if (/\b(?:pent|pant)[ -]?coat\b/.test(text)) return ["pent-coat"];
  if (/\b(?:suit|coat[ -]?and[ -]?pant)\b/.test(text)) return ["mens-suit"];
  if (/\b(?:men|mens|male)\b/.test(text) && /\b(?:shalwar|kameez|kurta)\b/.test(text)) {
    return ["mens-shalwar-kameez"];
  }
  if (/\b(?:men|mens|male)\b/.test(text) && /\bshirt\b/.test(text)) {
    return ["mens-shirt"];
  }
  if (/\b(?:women|womens|ladies|female)\b/.test(text)) {
    return ["womens-readywear"];
  }

  return [];
}

/** Kept for callers that need a single primary chart. */
export function resolveProductSizeGuideTemplate(
  product: Product
): SizeGuideTemplateKey | null {
  return resolveProductSizeGuideTemplates(product)[0] ?? null;
}

export function resolveProductSizeGuideUrl(product: Product): string | undefined {
  const customGuideUrl = product.commerce?.sizeGuideUrl?.trim();
  if (customGuideUrl) return customGuideUrl;
  return undefined;
}

export function hasProductSizeGuide(product: Product): boolean {
  return Boolean(
    resolveProductSizeGuideUrl(product) ||
      resolveProductSizeGuideTemplates(product).length
  );
}

export function isImageSizeGuideUrl(value: string): boolean {
  return /\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(value);
}
