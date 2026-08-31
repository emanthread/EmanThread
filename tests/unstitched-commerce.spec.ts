import { expect, test } from "@playwright/test";

import { normalizeCartItems } from "../lib/cart-store";
import {
  getActiveVariants,
  getVariantUnitPrice,
  hasOnlyUnstitchedCatalogPaths,
  isEffectivelyUnstitchedProduct,
  isProductAvailableForPurchase,
  isProductStitchingEligible,
  requiresVariantSelectionForPurchase,
  isUnstitchedColorVariantProduct,
} from "../lib/commerce";
import { classifyCatalogPath } from "../lib/catalog-product-classification";
import type { Product } from "../lib/data";

function staleUnstitchedProduct(paths: string[]): Product {
  return {
    id: "fabric-1",
    name: "Unstitched cotton",
    price: 3_000,
    description: "",
    longDescription: "",
    fabricType: "Cotton",
    color: "Blue",
    colorHex: "#0000ff",
    images: ["/placeholder.jpg"],
    inStock: true,
    stockQuantity: 10,
    sku: "FABRIC-1",
    catalogPaths: paths,
    commerce: {
      productKind: "READY_TO_WEAR",
      stitchingEligible: false,
      requiresSelection: true,
      optionLabel: "Size",
      sizeGuideUrl: "/size-guide",
      details: [],
      variants: [
        {
          id: "medium",
          optionKey: "m",
          label: "Medium",
          priceAdjustment: 500,
          stockQuantity: 5,
          inStock: true,
          isActive: true,
        },
      ],
    },
  };
}

test.describe("unstitched fabric purchase flow", () => {
  test("repairs stale size metadata when every catalog placement is unstitched", () => {
    for (const path of [
      "/women/unstitched/2-piece",
      "/women/unstitched/partywear",
      "/women/unstitched/saari-blouse",
      "/men/new-in/unstitched-collection",
      "/teens/unstitched/3-piece",
      "/women/partywear",
      "/women/bridal-wear",
    ]) {
      const product = staleUnstitchedProduct([path]);
      expect(isEffectivelyUnstitchedProduct(product), path).toBe(true);
      expect(getActiveVariants(product), path).toEqual([]);
      expect(requiresVariantSelectionForPurchase(product), path).toBe(false);
      expect(isProductAvailableForPurchase(product), path).toBe(true);
      expect(isProductStitchingEligible(product), path).toBe(true);
    }
  });

  test("does not let one promotional unstitched placement alter ready-to-wear", () => {
    const product = staleUnstitchedProduct([
      "/women/ready-to-wear/kurta",
      "/women/unstitched/1-piece",
    ]);

    expect(hasOnlyUnstitchedCatalogPaths(product.catalogPaths)).toBe(false);
    expect(isEffectivelyUnstitchedProduct(product)).toBe(false);
    expect(getActiveVariants(product)).toHaveLength(1);
    expect(requiresVariantSelectionForPurchase(product)).toBe(true);
    expect(isProductStitchingEligible(product)).toBe(false);
  });

  test("removes stale size snapshots from persisted unstitched cart lines", () => {
    const product = staleUnstitchedProduct(["/women/unstitched/noya"]);
    const [item] = normalizeCartItems([
      {
        lineId: "fabric-1:medium",
        product,
        quantity: 2,
        variant: {
          id: "medium",
          label: "Medium",
          priceAdjustment: 500,
        },
        selectedOptions: [{ label: "Size", value: "Medium" }],
        unitPrice: 3_500,
      },
    ]);

    expect(item.lineId).toBe(product.id);
    expect(item.variant).toBeUndefined();
    expect(item.selectedOptions).toBeUndefined();
    expect(getVariantUnitPrice(product)).toBe(product.price);
  });

  test("classifies future teen unstitched nodes as fabric, not sized teen apparel", () => {
    expect(classifyCatalogPath("/teens/unstitched/3-piece")?.productKind).toBe(
      "UNSTITCHED_FABRIC",
    );
  });

  test("uses concrete color SKUs for an explicit unstitched color profile", () => {
    const product: Product = {
      ...staleUnstitchedProduct(["/women/unstitched/2-piece"]),
      commerce: {
        productKind: "UNSTITCHED_FABRIC",
        stitchingEligible: true,
        requiresSelection: true,
        optionLabel: "Color",
        details: [],
        variants: [
          {
            id: "navy",
            optionKey: "navy",
            label: "Navy",
            colorHex: "#000080",
            images: ["/navy.jpg"],
            priceAdjustment: 250,
            stockQuantity: 4,
            inStock: true,
            isActive: true,
          },
        ],
      },
    };

    expect(isUnstitchedColorVariantProduct(product)).toBe(true);
    expect(getActiveVariants(product)).toHaveLength(1);
    expect(requiresVariantSelectionForPurchase(product)).toBe(true);
    expect(getVariantUnitPrice(product, product.commerce?.variants[0])).toBe(3_250);

    const [item] = normalizeCartItems([{
      product,
      quantity: 1,
      variant: { id: "navy", label: "Navy", priceAdjustment: 250 },
      selectedOptions: [{ label: "Color", value: "Navy" }],
      unitPrice: 3_250,
    }]);
    expect(item.lineId).toBe("fabric-1:navy");
    expect(item.selectedOptions).toEqual([{ label: "Color", value: "Navy" }]);
  });
});
