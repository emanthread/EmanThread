import type { Product } from "@/lib/data";
import { classifyCatalogPath } from "@/lib/catalog-product-classification";

export const STORE_POLICIES = {
  operatingHours: "10:00 AM - 9:00 PM",
  delivery: "7-10 days",
  refund: "15-20 days",
  exchange: "Request an exchange within 48 hours of delivery and provide an unboxing video.",
  sizeChange: "If you change the size, you are responsible for the exchange and delivery charges.",
  stitching: "Stitching is available for all unstitched fabrics on customer request.",
  garmentCare: "Dry clean only for these ready-to-wear items: coats, 1-piece, 2-piece and 3-piece outfits, pent coats, waistcoats, sherwanis, shafari (safari) suits, heavy partywear and bridal wear. This instruction does not apply to other product types.",
} as const;

// Match the owner's garment list; READY_TO_WEAR by itself is not a care rule.
const DRY_CLEAN_GARMENT = /\b(?:coats?|[123]\s*(?:p|pieces?)|(?:one|two|three)\s*pieces?|(?:pent|pant)\s*coats?|waistcoats?|sherwanis?|sh?afari(?:\s*suits?)?|heavy\s*party\s*wear|bridal(?:\s*wear)?)\b/i;

type CareProduct = Pick<Product, "commerce" | "catalogPaths"> & Partial<Pick<Product, "name" | "categoryName">>;

export function requiresDryCleaning(product: CareProduct): boolean {
  if (product.commerce && product.commerce.productKind !== "READY_TO_WEAR") return false;
  const paths = product.catalogPaths ?? [];
  const kinds = paths.map(path => classifyCatalogPath(path)?.productKind);
  if (kinds.length && kinds.every(kind => kind === "UNSTITCHED_FABRIC")) return false;
  if (product.commerce?.productKind !== "READY_TO_WEAR" && !kinds.includes("READY_TO_WEAR")) return false;

  const garmentTypes = paths
    .filter((_, index) => kinds[index] === "READY_TO_WEAR")
    .map(path => path.split("/").slice(2).join(" "));
  garmentTypes.push(product.categoryName ?? "", product.name ?? "");
  return garmentTypes.some(type => DRY_CLEAN_GARMENT.test(type.replace(/[-_]/g, " ")));
}

/** Update old published wording at render time; keep Admin content and records intact. */
export function refreshPolicyContent(content: string, page: "shipping" | "returns"): string {
  return content.replace(/<(p|li)\b[^>]*>[\s\S]*?<\/\1>/gi, block => {
    const text = block.replace(/<[^>]*>/g, " ");
    if (page === "shipping" && /deliver|shipping/i.test(text)) {
      return block.replace(/\b\d+\s*[-\u2013]\s*\d+\s*(?:(?:working|business)\s+)?days\b/gi, STORE_POLICIES.delivery);
    }
    if (page === "returns" && /exchange request/i.test(text)) {
      return block.replace(/\b(?:7\s+days|48\s+hours)\b/gi, "48 hours");
    }
    if (page === "returns" && /refund/i.test(text)) {
      return block.replace(/\b\d+\s*[-\u2013]\s*\d+\s*(?:(?:working|business)\s+)?days\b/gi, STORE_POLICIES.refund);
    }
    if (page === "returns" && /unboxing video/i.test(text)) {
      return block.replace(/(?:clear\s+)?(?:pictures|photos)\s+or\s+an?\s+unboxing video/gi, "an unboxing video");
    }
    return block;
  });
}
