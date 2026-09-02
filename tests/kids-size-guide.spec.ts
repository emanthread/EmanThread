import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import type { Product, ProductKind } from "../lib/data";
import {
  hasProductSizeGuide,
  resolveProductSizeGuideTemplates,
  resolveProductSizeGuideUrl,
} from "../lib/size-guide";

function product(productKind: ProductKind, sizeGuideUrl = ""): Product {
  return {
    id: "product-1",
    name: "Kids kurta",
    price: 2_500,
    description: "Kids ready-to-wear kurta",
    longDescription: "",
    fabricType: "Cotton",
    color: "Blue",
    colorHex: "#0000ff",
    images: ["/images/placeholder.svg"],
    inStock: true,
    sku: "KIDS-KURTA",
    catalogPaths: ["/teens/teen-boys/kurta"],
    commerce: {
      productKind,
      stitchingEligible: false,
      requiresSelection: true,
      sizeGuideUrl,
      details: [],
      options: [],
      variants: [],
    },
  };
}

test.describe("kids size guide", () => {
  test("uses the kids size chart template automatically for Teens products", () => {
    const kidsProduct = product("TEENS");

    expect(resolveProductSizeGuideTemplates(kidsProduct)).toEqual(["kids"]);
    expect(hasProductSizeGuide(kidsProduct)).toBe(true);
  });

  test("keeps a product-specific guide as the explicit override", () => {
    const customUrl = "/size-guides/custom-kids-guide.pdf";

    expect(resolveProductSizeGuideUrl(product("TEENS", customUrl))).toBe(
      customUrl
    );
  });

  test("adds the guide to the Size Guide gallery and product-card Quick View", () => {
    const templateFile = readFileSync(
      resolve(process.cwd(), "components/size-guide/size-guide-template.tsx"),
      "utf8"
    );
    const quickView = readFileSync(
      resolve(process.cwd(), "components/product/quick-view-modal.tsx"),
      "utf8"
    );

    expect(templateFile).toContain("kids: kidsSizeGuide");
    expect(quickView).toContain(
      "guideAction={<SizeGuideModal product={product} />}"
    );
  });
});
