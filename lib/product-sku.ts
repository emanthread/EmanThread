import { randomUUID } from "node:crypto";

const MAX_SKU_LENGTH = 120;

function skuPart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("en-US")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function automaticToken(): string {
  return randomUUID().replace(/-/g, "").slice(0, 12).toLocaleUpperCase("en-US");
}

function fitSku(prefix: string, suffix: string): string {
  const safeSuffix = suffix.slice(0, MAX_SKU_LENGTH - 2);
  const availablePrefixLength = Math.max(1, MAX_SKU_LENGTH - safeSuffix.length - 1);
  const safePrefix = prefix.slice(0, availablePrefixLength).replace(/-+$/g, "") || "ET";
  return `${safePrefix}-${safeSuffix}`;
}

/**
 * Generates a warehouse-friendly parent product code. The random token keeps
 * creation safe for catalogs containing many products with the same name.
 */
export function createAutomaticProductSku(name: string): string {
  const namePart = (skuPart(name) || "PRODUCT").slice(0, 72);
  return fitSku(`ET-${namePart}`, automaticToken());
}

/**
 * Generates the inventory identity for one concrete sellable combination.
 * The parent prefix keeps related combinations recognizable while the token
 * prevents administrators from having to manually coordinate global codes.
 */
export function createAutomaticVariantSku(
  productSku: string,
  optionKey: string,
  label: string
): string {
  const optionPart = (skuPart(label) || skuPart(optionKey) || "OPTION").slice(0, 36);
  return fitSku(skuPart(productSku) || "ET-PRODUCT", `${optionPart}-${automaticToken()}`);
}

