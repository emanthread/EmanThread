import { expect, test } from "@playwright/test";

import { safeInternalReturnPath, withQueryValue } from "../lib/internal-return-path";
import { getProfileStitchingPrice } from "../lib/stitching-profile";
import { useCartStore } from "../lib/cart-store";
import type { Product } from "../lib/data";

test.describe("stitching profile return flow", () => {
  test("accepts local product and checkout paths", () => {
    expect(safeInternalReturnPath("/product/fabric-1?color=blue")).toBe(
      "/product/fabric-1?color=blue",
    );
    expect(withQueryValue("/checkout?stitchingLineId=line-1", "measurementProfileId", "profile-1"))
      .toBe("/checkout?stitchingLineId=line-1&measurementProfileId=profile-1");
  });

  test("rejects external and protocol-relative returns", () => {
    expect(safeInternalReturnPath("https://example.com/steal", "/safe")).toBe("/safe");
    expect(safeInternalReturnPath("//example.com/steal", "/safe")).toBe("/safe");
    expect(safeInternalReturnPath("/\\example.com/steal", "/safe")).toBe("/safe");
  });
});

test.describe("stitching profile estimates", () => {
  test("uses the configured canonical garment price", () => {
    expect(getProfileStitchingPrice(
      { garmentType: "male_shirt", gender: "Male" },
      { male: { shirt: 1800 } },
    )).toBe(1800);
  });

  test("uses a legacy same-garment price fallback", () => {
    expect(getProfileStitchingPrice(
      { garmentType: "male_shalwar_kameez", gender: "Male" },
      { male: { "shalwar kameez": 2500 } },
    )).toBe(2500);
  });
});

test.describe("product-to-cart stitching choice", () => {
  const fabric: Product = {
    id: "fabric-with-stitching",
    name: "Unstitched Fabric",
    price: 5000,
    description: "",
    longDescription: "",
    fabricType: "Cotton",
    color: "Blue",
    colorHex: "#0000ff",
    images: ["/placeholder.jpg"],
    inStock: true,
    stockQuantity: 10,
    sku: "FABRIC-1",
    catalogPaths: ["men/unstitched"],
  };

  test.beforeEach(() => {
    useCartStore.setState({ items: [], isOpen: false });
  });

  test("attaches the selected owned profile to the cart line", () => {
    useCartStore.getState().addItem(fabric, 1, {
      price: 2500,
      profileId: "profile-1",
      profileName: "My Shalwar Kameez",
    });

    expect(useCartStore.getState().items[0]).toMatchObject({
      quantity: 1,
      stitchingProfileId: "profile-1",
      stitchingProfileName: "My Shalwar Kameez",
      stitchingPrice: 2500,
    });
  });

  test("preserves an explicit fabric-only choice instead of a previous profile", () => {
    useCartStore.getState().addItem(fabric, 1, {
      price: 2500,
      profileId: "profile-1",
      profileName: "My Shalwar Kameez",
    });
    useCartStore.getState().addItem(fabric, 1, {
      price: null,
      profileId: null,
      profileName: null,
    });

    expect(useCartStore.getState().items[0]).toMatchObject({
      quantity: 2,
      stitchingProfileId: null,
      stitchingProfileName: null,
      stitchingPrice: null,
    });
  });
});
