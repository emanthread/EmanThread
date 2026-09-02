import { expect, test } from "@playwright/test";
import {
  canSaveProductKindWithoutCompanionFeature,
  catalogPathBreadcrumb,
  classifyCatalogNode,
  classifyCatalogPath,
  classificationForProductKind,
  defaultCommerceSettingsForClassification,
  PRODUCT_KIND_OPTIONS,
  normalizeCatalogCompatibilityFields,
} from "../lib/catalog-product-classification";
import type { ProductKind } from "../lib/data";
import { catalogMenu } from "../lib/navigation/catalog-menu";

test.describe("catalog-driven product classification", () => {
  test("maps representative catalog branches to the correct merchandise behavior", () => {
    expect(classifyCatalogPath("/women/ready-to-wear/kurta")?.productKind).toBe(
      "READY_TO_WEAR"
    );
    expect(classifyCatalogPath("/men/ready-to-wear/2-piece")?.productKind).toBe(
      "READY_TO_WEAR"
    );
    expect(classifyCatalogPath("/men/ready-to-wear/3-piece")?.productKind).toBe(
      "READY_TO_WEAR"
    );
    expect(classifyCatalogPath("/men/ready-to-wear/coat")?.productKind).toBe(
      "READY_TO_WEAR"
    );
    expect(
      classifyCatalogPath("/men/ready-to-wear/dress-shirt")?.productKind
    ).toBe("READY_TO_WEAR");
    expect(classifyCatalogPath("/women/ready-to-wear/casual")?.productKind).toBe(
      "READY_TO_WEAR"
    );
    expect(classifyCatalogPath("/men/ready-to-wear/formal")?.productKind).toBe(
      "READY_TO_WEAR"
    );
    expect(classifyCatalogPath("/men/ready-to-wear/casual")?.productKind).toBe(
      "READY_TO_WEAR"
    );
    expect(classifyCatalogPath("/men/unstitched/boski")?.productKind).toBe(
      "UNSTITCHED_FABRIC"
    );
    expect(
      classifyCatalogPath("/fragrance-beauty/fragrances/men/perfume")?.productKind
    ).toBe("FRAGRANCE");
    expect(classifyCatalogPath("/teens/teen-girls/kurti")?.productKind).toBe(
      "TEENS"
    );
    expect(classifyCatalogPath("/teens/teen-girls/casual")?.productKind).toBe(
      "TEENS"
    );
    expect(classifyCatalogPath("/teens/teen-boys/occasion-wear")?.productKind).toBe(
      "TEENS"
    );
    expect(
      classifyCatalogPath("/men/ready-to-wear/exclusive-gift-box")?.productKind
    ).toBe("GIFT_BOX");
    expect(classifyCatalogPath("/women/partywear")?.productKind).toBe(
      "UNSTITCHED_FABRIC"
    );
    expect(classifyCatalogPath("/women/bridal-wear")?.productKind).toBe(
      "UNSTITCHED_FABRIC"
    );
    expect(
      classifyCatalogPath("/women/ready-to-wear/partywear")?.productKind
    ).toBe("READY_TO_WEAR");
    expect(
      classifyCatalogPath("/women/ready-to-wear/bridal-wear")?.productKind
    ).toBe("READY_TO_WEAR");
    expect(
      classifyCatalogPath("/women/unstitched/partywear")?.productKind
    ).toBe("UNSTITCHED_FABRIC");
    expect(
      classifyCatalogPath("/women/unstitched/saari-blouse")?.productKind
    ).toBe("UNSTITCHED_FABRIC");
  });

  test("keeps legacy and canonical unstitched collections in the fabric purchase model", () => {
    for (const path of [
      "/women/partywear",
      "/women/bridal-wear",
      "/women/unstitched/partywear",
      "/women/unstitched/saari-blouse",
    ]) {
      expect(classifyCatalogPath(path)).toMatchObject({
        productKind: "UNSTITCHED_FABRIC",
        editorSchema: {
          fields: {
            fabric: { mode: "required" },
            sizeGuide: { mode: "hidden" },
            stitching: { mode: "optional" },
          },
          inventorySource: "product",
          options: { mode: "optional" },
        },
      });
    }
  });

  test("gives ready-to-wear Partywear and Bridal real size inventory", () => {
    for (const path of [
      "/women/ready-to-wear/partywear",
      "/women/ready-to-wear/bridal-wear",
    ]) {
      expect(classifyCatalogPath(path)).toMatchObject({
        productKind: "READY_TO_WEAR",
        editorSchema: {
          fields: {
            fabric: { mode: "optional" },
            sizeGuide: { mode: "optional" },
            stitching: { mode: "hidden" },
          },
          inventorySource: "variant",
          options: { mode: "required", label: "Size" },
        },
      });
    }
  });

  test("uses catalog subtype for beauty color and accessories", () => {
    const lipstick = classifyCatalogPath(
      "/fragrance-beauty/makeup/lips/lipstick"
    );
    const skincare = classifyCatalogPath("/fragrance-beauty/skincare/face");
    const applicator = classifyCatalogPath(
      "/fragrance-beauty/makeup/accessories/blender-sponge"
    );

    expect(lipstick).toMatchObject({
      productKind: "BEAUTY",
      editorSchema: { fields: { color: { mode: "optional" } } },
    });
    expect(skincare).toMatchObject({
      productKind: "BEAUTY",
      editorSchema: { fields: { color: { mode: "hidden" } } },
    });
    expect(applicator?.productKind).toBe("ACCESSORY");
  });

  test("uses typed catalog metadata even when a category URL is renamed", () => {
    expect(
      classifyCatalogNode({
        path: "/collections/eid-edit",
        productKind: "READY_TO_WEAR",
      })
    ).toMatchObject({
      productKind: "READY_TO_WEAR",
      editorSchema: {
        fields: { color: { mode: "required" } },
        options: { label: "Size", mode: "required" },
      },
    });
    expect(
      classifyCatalogNode({
        path: "/women/ready-to-wear",
        productKind: null,
      })
    ).toBeNull();
  });

  test("does not pretend mixed landing pages are primary product categories", () => {
    for (const path of [
      "/women",
      "/women/new-in",
      "/men/sale",
      "/fragrance-beauty/new-in",
      "/teens",
    ]) {
      expect(classifyCatalogPath(path), path).toBeNull();
    }
  });

  test("classifies every specific visible catalog destination", () => {
    const leaves = catalogMenu.flatMap((department) =>
      department.sections.flatMap((section) =>
        section.groups.flatMap((group) =>
          group.items.filter(
            (item) =>
              item.href &&
              item.visibility === "visible" &&
              item.status === "active" &&
              !item.comingSoon
          )
        )
      )
    );

    const ambiguousPaths = Array.from(
      new Set(
        leaves
          .map((leaf) => leaf.href!)
          .filter((path) => classifyCatalogPath(path) === null)
      )
    );

    // This configured href is intentionally shared by mixed New In content,
    // so the editor must not offer it as a primary classification.
    expect(ambiguousPaths).toEqual(["/women/new-in"]);
  });

  test("removes non-applicable compatibility fields instead of inventing fake values", () => {
    const fragrance = classifyCatalogPath(
      "/fragrance-beauty/fragrances/women/perfume"
    );
    expect(fragrance).not.toBeNull();
    expect(
      normalizeCatalogCompatibilityFields(fragrance!, {
        fabricType: "Cotton",
        color: "Black",
        colorHex: "#000000",
      })
    ).toEqual({ fabricType: "", color: "", colorHex: "" });
  });

  test("renders merchant-readable breadcrumbs", () => {
    expect(catalogPathBreadcrumb("/women/ready-to-wear/3-piece")).toBe(
      "Women → Ready To Wear → 3 Piece"
    );
  });

  test("preserves product type while its companion rollout feature is disabled", () => {
    expect(
      canSaveProductKindWithoutCompanionFeature(
        "READY_TO_WEAR",
        "READY_TO_WEAR"
      )
    ).toBe(true);
    expect(
      canSaveProductKindWithoutCompanionFeature(
        "READY_TO_WEAR",
        "UNSTITCHED_FABRIC"
      )
    ).toBe(false);
    expect(
      canSaveProductKindWithoutCompanionFeature(undefined, "READY_TO_WEAR")
    ).toBe(false);
    expect(
      canSaveProductKindWithoutCompanionFeature(
        undefined,
        "UNSTITCHED_FABRIC"
      )
    ).toBe(true);
  });

  test("defines every editor decision in one product-kind schema", () => {
    const expected: Record<
      ProductKind,
      {
        fabric: string;
        color: string;
        sizeGuide: string;
        stitching: string;
        inventory: string;
        options: string;
        optionLabel: string;
        presetCount: number;
      }
    > = {
      UNSTITCHED_FABRIC: {
        fabric: "required",
        color: "required",
        sizeGuide: "hidden",
        stitching: "optional",
        inventory: "product",
        options: "optional",
        optionLabel: "Option",
        presetCount: 0,
      },
      READY_TO_WEAR: {
        fabric: "optional",
        color: "required",
        sizeGuide: "optional",
        stitching: "hidden",
        inventory: "variant",
        options: "required",
        optionLabel: "Size",
        presetCount: 6,
      },
      FRAGRANCE: {
        fabric: "hidden",
        color: "hidden",
        sizeGuide: "hidden",
        stitching: "hidden",
        inventory: "product",
        options: "optional",
        optionLabel: "Volume",
        presetCount: 0,
      },
      BEAUTY: {
        fabric: "hidden",
        color: "hidden",
        sizeGuide: "hidden",
        stitching: "hidden",
        inventory: "product",
        options: "optional",
        optionLabel: "Shade / option",
        presetCount: 0,
      },
      TEENS: {
        fabric: "optional",
        color: "required",
        sizeGuide: "optional",
        stitching: "hidden",
        inventory: "variant",
        options: "required",
        optionLabel: "Size",
        presetCount: 6,
      },
      GIFT: {
        fabric: "hidden",
        color: "hidden",
        sizeGuide: "hidden",
        stitching: "hidden",
        inventory: "product",
        options: "optional",
        optionLabel: "Gift option",
        presetCount: 0,
      },
      GIFT_BOX: {
        fabric: "hidden",
        color: "hidden",
        sizeGuide: "hidden",
        stitching: "hidden",
        inventory: "product",
        options: "optional",
        optionLabel: "Gift option",
        presetCount: 0,
      },
      ACCESSORY: {
        fabric: "hidden",
        color: "hidden",
        sizeGuide: "hidden",
        stitching: "hidden",
        inventory: "product",
        options: "optional",
        optionLabel: "Option",
        presetCount: 0,
      },
    };

    expect(PRODUCT_KIND_OPTIONS.map((option) => option.value).sort()).toEqual(
      Object.keys(expected).sort()
    );

    for (const [productKind, rules] of Object.entries(expected) as Array<
      [ProductKind, (typeof expected)[ProductKind]]
    >) {
      const classification = classificationForProductKind(productKind);
      const schema = classification.editorSchema;
      expect(
        {
          fabric: schema.fields.fabric.mode,
          color: schema.fields.color.mode,
          sizeGuide: schema.fields.sizeGuide.mode,
          stitching: schema.fields.stitching.mode,
          inventory: schema.inventorySource,
          options: schema.options.mode,
          optionLabel: schema.options.label,
          presetCount: schema.options.presets.length,
        },
        productKind
      ).toEqual(rules);
      expect(defaultCommerceSettingsForClassification(classification)).toEqual({
        productKind,
        stitchingEligible: rules.stitching !== "hidden",
        requiresSelection: rules.options === "required",
        optionLabel: rules.optionLabel,
      });
    }
  });
});
