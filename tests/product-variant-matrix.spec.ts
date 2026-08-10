import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { normalizeCartItems } from "../lib/cart-store";
import {
  getProductOptions,
  getVariantImages,
  productOptionsForVariant,
  requiresVariantSelectionForPurchase,
} from "../lib/commerce";
import type { Product, ProductOption, ProductVariant } from "../lib/data";
import {
  emptyCommerceProfileDraft,
  serializeCommerceProfile,
} from "../components/admin/product-commerce-profile-section";
import {
  classificationForProductKind,
  classifyCatalogPath,
} from "../lib/catalog-product-classification";

const color: ProductOption = {
  id: "color-axis",
  key: "color",
  label: "Color",
  type: "COLOR",
  isRequired: true,
  displayOrder: 0,
  values: [
    { id: "black", key: "black", label: "Black", swatchHex: "#000000", images: ["/black.jpg"], isActive: true, displayOrder: 0 },
    { id: "navy", key: "navy", label: "Navy", swatchHex: "#000080", images: ["/navy.jpg"], isActive: true, displayOrder: 1 },
  ],
};
const size: ProductOption = {
  id: "size-axis",
  key: "size",
  label: "Size",
  type: "SIZE",
  isRequired: true,
  displayOrder: 1,
  values: [
    { id: "small", key: "s", label: "S", isActive: true, displayOrder: 0 },
    { id: "medium", key: "m", label: "M", isActive: true, displayOrder: 1 },
  ],
};

function variant(colorValue: "black" | "navy", sizeValue: "small" | "medium", stockQuantity = 3): ProductVariant {
  const colorLabel = colorValue === "black" ? "Black" : "Navy";
  const sizeLabel = sizeValue === "small" ? "S" : "M";
  return {
    id: `${colorValue}-${sizeValue}`,
    optionKey: `color:${colorValue}|size:${sizeValue === "small" ? "s" : "m"}`,
    label: `${colorLabel} / ${sizeLabel}`,
    sku: `K-${colorValue}-${sizeValue}`,
    priceAdjustment: sizeValue === "medium" ? 250 : 0,
    stockQuantity,
    inStock: stockQuantity > 0,
    isActive: true,
    selections: [
      { optionId: color.id, optionKey: color.key, optionLabel: color.label, optionType: color.type, valueId: colorValue, valueKey: colorValue, valueLabel: colorLabel },
      { optionId: size.id, optionKey: size.key, optionLabel: size.label, optionType: size.type, valueId: sizeValue, valueKey: sizeValue === "small" ? "s" : "m", valueLabel: sizeLabel },
    ],
  };
}

function readyToWear(): Product {
  return {
    id: "kurta",
    name: "Classic Kurta",
    price: 4_000,
    description: "",
    longDescription: "",
    fabricType: "Cotton",
    color: "Black",
    colorHex: "#000000",
    images: ["/parent.jpg"],
    inStock: true,
    stockQuantity: 9,
    sku: "KURTA",
    commerce: {
      productKind: "READY_TO_WEAR",
      stitchingEligible: false,
      requiresSelection: true,
      optionLabel: "Color",
      details: [],
      options: [color, size],
      variants: [variant("black", "small"), variant("black", "medium"), variant("navy", "small", 0), variant("navy", "medium")],
    },
  };
}

test.describe("normalized product variant matrix", () => {
  test("represents RTW Color x Size as concrete sellable combinations", () => {
    const product = readyToWear();
    const selected = product.commerce!.variants[1];

    expect(getProductOptions(product).map((option) => option.type)).toEqual(["COLOR", "SIZE"]);
    expect(productOptionsForVariant(product, selected)).toEqual([
      { label: "Color", value: "Black" },
      { label: "Size", value: "M" },
    ]);
    expect(getVariantImages(product, selected)).toEqual(["/black.jpg"]);
    expect(requiresVariantSelectionForPurchase(product)).toBe(true);
  });

  test("keeps the combination identity and full selection snapshot in persisted carts", () => {
    const product = readyToWear();
    const selected = product.commerce!.variants[3];
    const selectedOptions = productOptionsForVariant(product, selected);
    const [item] = normalizeCartItems([{ product, quantity: 2, variant: { id: selected.id, label: selected.label, sku: selected.sku, priceAdjustment: selected.priceAdjustment }, selectedOptions, unitPrice: 4_250 }]);

    expect(item.lineId).toBe("kurta:navy-medium");
    expect(item.selectedOptions).toEqual([
      { label: "Color", value: "Navy" },
      { label: "Size", value: "M" },
    ]);
  });

  test("serializes a complete RTW matrix instead of unrelated option lists", () => {
    const options = [color, size].map((option) => ({
      ...option,
      values: option.values.map((value) => ({ ...value, swatchHex: value.swatchHex || "", images: value.images || [] })),
    }));
    const variants = readyToWear().commerce!.variants.map((item) => ({
      id: item.id,
      optionKey: item.optionKey,
      label: item.label,
      sku: item.sku || "",
      priceAdjustment: String(item.priceAdjustment),
      stockQuantity: String(item.stockQuantity),
      inStock: item.inStock,
      isActive: item.isActive,
      colorHex: "",
      images: [],
      selections: item.selections!.map((selection) => ({ optionKey: selection.optionKey, valueKey: selection.valueKey })),
    }));
    const payload = serializeCommerceProfile({ ...emptyCommerceProfileDraft(), productKind: "READY_TO_WEAR", stitchingEligible: false, requiresSelection: true, optionLabel: "Color", options, variants });

    expect(payload.options).toHaveLength(2);
    expect(payload.variants).toHaveLength(4);
    expect(payload.variants.every((item) => item.selections?.length === 2)).toBe(true);
  });

  test("keeps legacy no-option products on parent inventory", () => {
    const product = { ...readyToWear(), commerce: undefined, stockQuantity: 2 };
    expect(getProductOptions(product)).toEqual([]);
    expect(requiresVariantSelectionForPurchase(product)).toBe(false);
  });

  test("defines universal option policy by business-relevant product type", () => {
    expect(classificationForProductKind("UNSTITCHED_FABRIC").editorSchema.optionAxes).toEqual({ required: [], optional: ["COLOR"] });
    expect(classificationForProductKind("READY_TO_WEAR").editorSchema.optionAxes).toEqual({ required: ["SIZE"], optional: ["COLOR"] });
    expect(classificationForProductKind("TEENS").editorSchema.optionAxes).toEqual({ required: ["SIZE"], optional: ["COLOR"] });
    expect(classifyCatalogPath("/fragrance-beauty/makeup/lips")?.editorSchema.optionAxes.optional).toEqual(["SHADE"]);
    expect(classifyCatalogPath("/fragrance-beauty/skincare/serums")?.editorSchema.optionAxes.optional).toEqual([]);
    expect(classificationForProductKind("FRAGRANCE").editorSchema.optionAxes.optional).toEqual(["VOLUME"]);
    expect(classificationForProductKind("ACCESSORY").editorSchema.optionAxes.optional).toContain("COLOR");
    expect(classificationForProductKind("GIFT").editorSchema.optionAxes.optional).not.toContain("COLOR");
  });

  test("uses the same concrete Color x Size model for Teens", () => {
    const product = readyToWear();
    product.commerce!.productKind = "TEENS";
    expect(productOptionsForVariant(product, product.commerce!.variants[0])).toEqual([
      { label: "Color", value: "Black" },
      { label: "Size", value: "S" },
    ]);
  });

  test("supports a Beauty shade SKU and shade-owned gallery", () => {
    const product = readyToWear();
    const shadeOption: ProductOption = { ...color, id: "shade-axis", key: "shade", label: "Shade", type: "SHADE" };
    const shadeVariant: ProductVariant = {
      ...variant("black", "small"),
      id: "rosewood",
      optionKey: "shade:rosewood",
      label: "Rosewood",
      sku: "LIP-ROSEWOOD",
      selections: [{ optionId: shadeOption.id, optionKey: shadeOption.key, optionLabel: shadeOption.label, optionType: shadeOption.type, valueId: "black", valueKey: "black", valueLabel: "Black" }],
    };
    product.commerce = { productKind: "BEAUTY", stitchingEligible: false, requiresSelection: true, optionLabel: "Shade", details: [], options: [shadeOption], variants: [shadeVariant] };
    expect(getVariantImages(product, shadeVariant)).toEqual(["/black.jpg"]);
    expect(productOptionsForVariant(product, shadeVariant)).toEqual([{ label: "Shade", value: "Black" }]);
  });

  test("migration is additive and inventory/restock stay keyed by variant id", () => {
    const migration = readFileSync(join(process.cwd(), "prisma/migrations/20260810000000_add_normalized_product_options/migration.sql"), "utf8");
    const orders = readFileSync(join(process.cwd(), "lib/db/orders.ts"), "utf8");
    const cancellation = readFileSync(join(process.cwd(), "app/api/orders/[id]/cancel/route.ts"), "utf8");

    expect(migration).toContain("ProductVariantSelection");
    expect(migration).not.toMatch(/UPDATE\s+"OrderItemConfiguration"/i);
    expect(orders).toContain("stockQuantity: { decrement: item.quantity }");
    expect(orders).toContain("variant.selectedOptions");
    expect(cancellation).toContain("stockQuantity: { increment: item.quantity }");
  });
});
