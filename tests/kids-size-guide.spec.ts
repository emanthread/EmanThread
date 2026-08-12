import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import type { Product, ProductKind } from "../lib/data";
import {
  hasProductSizeGuide,
  KIDS_SIZE_GUIDE_URL,
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
  test("publishes the supplied PDF as a valid public asset", () => {
    const pdf = readFileSync(
      resolve(process.cwd(), `public${KIDS_SIZE_GUIDE_URL}`)
    );

    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(100_000);
  });

  test("uses the kids PDF automatically for Teens products", () => {
    const kidsProduct = product("TEENS");

    expect(resolveProductSizeGuideUrl(kidsProduct)).toBe(KIDS_SIZE_GUIDE_URL);
    expect(hasProductSizeGuide(kidsProduct)).toBe(true);
  });

  test("keeps a product-specific guide as the explicit override", () => {
    const customUrl = "/size-guides/custom-kids-guide.pdf";

    expect(resolveProductSizeGuideUrl(product("TEENS", customUrl))).toBe(
      customUrl
    );
  });

  test("does not assign the kids PDF to adult or unstitched products", () => {
    expect(resolveProductSizeGuideUrl(product("READY_TO_WEAR"))).toBeUndefined();
    expect(
      resolveProductSizeGuideUrl(product("UNSTITCHED_FABRIC"))
    ).toBeUndefined();
  });

  test("adds the guide to the Size Guide footer and product-card Quick View", () => {
    const sizeGuidePage = readFileSync(
      resolve(process.cwd(), "app/size-guide/page.tsx"),
      "utf8"
    );
    const quickView = readFileSync(
      resolve(process.cwd(), "components/product/quick-view-modal.tsx"),
      "utf8"
    );
    const modal = readFileSync(
      resolve(process.cwd(), "components/product/size-guide-modal.tsx"),
      "utf8"
    );

    expect(sizeGuidePage).toContain("Kids / Teens size guide");
    expect(sizeGuidePage).toContain("Open kids size guide (PDF)");
    expect(quickView).toContain(
      "guideAction={<SizeGuideModal product={product} />}"
    );
    expect(modal).toContain('href={guideUrl} target="_blank"');
  });
});
