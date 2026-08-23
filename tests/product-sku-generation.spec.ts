import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

import {
  createAutomaticProductSku,
  createAutomaticVariantSku,
} from "../lib/product-sku";
import {
  emptyCommerceProfileDraft,
  serializeCommerceProfile,
} from "../components/admin/product-commerce-profile-section";

test.describe("automatic product and variant SKUs", () => {
  test("creates readable globally unique product codes within the database limit", () => {
    const first = createAutomaticProductSku("Royal Blue Kurta");
    const second = createAutomaticProductSku("Royal Blue Kurta");

    expect(first).toMatch(/^ET-ROYAL-BLUE-KURTA-[A-F0-9]{12}$/);
    expect(second).not.toBe(first);
    expect(first.length).toBeLessThanOrEqual(120);
  });

  test("creates a different concrete code for every sellable combination", () => {
    const productSku = createAutomaticProductSku("Classic Kurta");
    const small = createAutomaticVariantSku(productSku, "color:black|size:s", "Black / S");
    const medium = createAutomaticVariantSku(productSku, "color:black|size:m", "Black / M");

    expect(small).toContain("BLACK-S");
    expect(medium).toContain("BLACK-M");
    expect(small).not.toBe(medium);
    expect(small.length).toBeLessThanOrEqual(120);
    expect(medium.length).toBeLessThanOrEqual(120);
  });

  test("allows an active option combination to be submitted without manual SKU entry", () => {
    const payload = serializeCommerceProfile({
      ...emptyCommerceProfileDraft(),
      productKind: "READY_TO_WEAR",
      stitchingEligible: false,
      requiresSelection: true,
      optionLabel: "Size",
      options: [
        {
          key: "size",
          label: "Size",
          type: "SIZE",
          isRequired: true,
          values: [
            {
              key: "s",
              label: "S",
              swatchHex: "",
              images: [],
              isActive: true,
            },
          ],
        },
      ],
      variants: [
        {
          optionKey: "size:s",
          label: "S",
          sku: "",
          priceAdjustment: "0",
          stockQuantity: "5",
          inStock: true,
          isActive: true,
          colorHex: "",
          images: [],
          selections: [{ optionKey: "size", valueKey: "s" }],
        },
      ],
    });

    expect(payload.variants[0].sku).toBeUndefined();
  });

  test("keeps manual overrides but makes both admin fields visibly optional", () => {
    const editor = readFileSync(
      resolve(process.cwd(), "components/admin/product-editor.tsx"),
      "utf8"
    );
    const commerceEditor = readFileSync(
      resolve(process.cwd(), "components/admin/product-commerce-profile-section.tsx"),
      "utf8"
    );
    const saveRoute = readFileSync(
      resolve(process.cwd(), "app/api/admin/products/editor/route.ts"),
      "utf8"
    );

    expect(editor).toContain("Product code (SKU) (optional)");
    expect(editor).toContain("Generated automatically when empty");
    expect(editor).not.toContain('next.sku = "Enter a product code (SKU)"');
    expect(commerceEditor).toContain("Option SKU (optional)");
    expect(commerceEditor).toContain("Empty SKUs are generated when you save");
    expect(saveRoute).toContain("requestedProductSku || existing?.sku || createAutomaticProductSku");
    expect(saveRoute).toContain("createAutomaticVariantSku(");
  });
});

