import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

import {
  adminSelectableOptionTypes,
  emptyCommerceProfileDraft,
  initialNormalizedOptions,
  optionTypeCustomerLabel,
  rebuildCombinationDrafts,
  serializeCommerceProfile,
} from "../components/admin/product-commerce-profile-section";
import {
  classificationForProductKind,
  classifyCatalogPath,
  productEditorSchemaForKind,
} from "../lib/catalog-product-classification";

test.describe("simplified admin selling options", () => {
  test("prefills the canonical locked Size axis and common apparel sizes", () => {
    const schema = productEditorSchemaForKind("READY_TO_WEAR");
    const options = initialNormalizedOptions(
      "READY_TO_WEAR",
      schema.options.presets
    );

    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      key: "size",
      label: "Size",
      type: "SIZE",
      isRequired: true,
    });
    expect(options[0].values.map((value) => value.label)).toEqual([
      "S",
      "M",
      "L",
      "XL",
    ]);
    expect(rebuildCombinationDrafts(options, []).map((variant) => variant.label)).toEqual([
      "S",
      "M",
      "L",
      "XL",
    ]);
  });

  test("uses the same automatic Size setup for Teens", () => {
    const schema = productEditorSchemaForKind("TEENS");
    const options = initialNormalizedOptions("TEENS", schema.options.presets);

    expect(options[0].key).toBe("size");
    expect(options[0].label).toBe("Size");
    expect(options[0].values.map((value) => value.key)).toEqual([
      "s",
      "m",
      "l",
      "xl",
    ]);
  });

  test("uses product-aware axes instead of assuming Size everywhere", () => {
    expect(
      initialNormalizedOptions("UNSTITCHED_FABRIC", [], "COLOR")[0]
    ).toMatchObject({ key: "color", label: "Color", type: "COLOR" });
    expect(
      initialNormalizedOptions("FRAGRANCE", [], "VOLUME")[0]
    ).toMatchObject({ key: "volume", label: "Volume", type: "VOLUME" });
    expect(initialNormalizedOptions("BEAUTY", [], "SHADE")[0]).toMatchObject({
      key: "shade",
      label: "Shade",
      type: "SHADE",
    });
    expect(initialNormalizedOptions("GIFT", [], "FORMAT")[0]).toMatchObject({
      key: "format",
      label: "Gift option",
      type: "FORMAT",
    });
    expect(optionTypeCustomerLabel("SIZE", "ACCESSORY")).toBe("Size");
    expect(optionTypeCustomerLabel("STYLE", "ACCESSORY")).toBe("Style");
    expect(rebuildCombinationDrafts([], [])).toEqual([]);
    expect(
      adminSelectableOptionTypes("GIFT", ["FORMAT", "STYLE", "CUSTOM"])
    ).toEqual(["FORMAT"]);
    expect(
      adminSelectableOptionTypes("ACCESSORY", [
        "COLOR",
        "SIZE",
        "STYLE",
        "FORMAT",
        "CUSTOM",
      ])
    ).toEqual(["COLOR", "SIZE", "STYLE", "FORMAT", "CUSTOM"]);
  });

  test("exposes only the option types allowed by each product classification", () => {
    expect(classificationForProductKind("READY_TO_WEAR").editorSchema.optionAxes).toEqual({
      required: ["SIZE"],
      optional: ["COLOR"],
    });
    expect(classificationForProductKind("FRAGRANCE").editorSchema.optionAxes).toEqual({
      required: [],
      optional: ["VOLUME"],
    });
    expect(classifyCatalogPath("/fragrance-beauty/makeup/lips")?.editorSchema.optionAxes).toEqual({
      required: [],
      optional: ["SHADE"],
    });
    expect(classifyCatalogPath("/fragrance-beauty/skincare/serums")?.editorSchema.optionAxes).toEqual({
      required: [],
      optional: [],
    });
    expect(classificationForProductKind("ACCESSORY").editorSchema.optionAxes.optional).toEqual([
      "COLOR",
      "SIZE",
      "STYLE",
      "FORMAT",
      "CUSTOM",
    ]);
  });

  test("derives hidden internal keys from customer labels", () => {
    const payload = serializeCommerceProfile({
      ...emptyCommerceProfileDraft(),
      productKind: "FRAGRANCE",
      stitchingEligible: false,
      requiresSelection: true,
      optionLabel: "Volume",
      variants: [
        {
          optionKey: "",
          label: "50 ml",
          sku: "",
          priceAdjustment: "0",
          stockQuantity: "4",
          inStock: true,
          isActive: true,
          colorHex: "",
          images: [],
        },
      ],
    });

    expect(payload.variants[0].optionKey).toBe("50-ml");
    expect(payload.variants[0].label).toBe("50 ml");
  });

  test("shows system keys as automatic and provides quick size selection", () => {
    const commerceEditor = readFileSync(
      resolve(process.cwd(), "components/admin/product-commerce-profile-section.tsx"),
      "utf8"
    );
    const productEditor = readFileSync(
      resolve(process.cwd(), "components/admin/product-editor.tsx"),
      "utf8"
    );

    expect(commerceEditor).toContain("System key:");
    expect(commerceEditor).toContain("(automatic)");
    expect(commerceEditor).toContain("Select common sizes");
    expect(commerceEditor).toContain("S, M, L, and XL are selected by default");
    expect(commerceEditor).toContain("selectableOptionTypes.map((type)");
    expect(commerceEditor).toContain("Products can remain single items");
    expect(commerceEditor).toContain("No selling options apply to this category");
    expect(productEditor).toContain("initializeRequiredOptions");
    expect(productEditor).toContain("initialNormalizedOptions(");
  });

  test("links variant products directly to their option stock editor", () => {
    const productList = readFileSync(
      resolve(process.cwd(), "components/admin/product-list-page.tsx"),
      "utf8"
    );
    const productEditor = readFileSync(
      resolve(process.cwd(), "components/admin/product-editor.tsx"),
      "utf8"
    );
    const commerceEditor = readFileSync(
      resolve(process.cwd(), "components/admin/product-commerce-profile-section.tsx"),
      "utf8"
    );

    expect(productList).toContain("Update option stock");
    expect(productList).toContain("/edit#commerce-section");
    expect(productEditor).toContain(
      'window.location.hash !== "#commerce-section"'
    );
    expect(productEditor).toContain('scrollIntoView({ block: "start" })');
    expect(commerceEditor).toContain('id="commerce-section"');
    expect(commerceEditor).toContain("scroll-mt-24");
  });
});
