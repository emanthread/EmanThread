import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import {
  CATALOG_BANNER_MAX_BYTES,
  catalogBannerFileError,
  isAllowedCatalogBannerImage,
} from "../lib/catalog-banner";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test.describe("catalog subcategory banner admin", () => {
  test("accepts only the image sources supported by the storefront", () => {
    expect(isAllowedCatalogBannerImage("/images/catalog/kurta.jpg")).toBe(true);
    expect(
      isAllowedCatalogBannerImage(
        "https://res.cloudinary.com/demo/image/upload/kurta.webp"
      )
    ).toBe(true);
    expect(
      isAllowedCatalogBannerImage("https://images.unsplash.com/photo-123")
    ).toBe(true);
    expect(isAllowedCatalogBannerImage("//example.com/banner.jpg")).toBe(false);
    expect(isAllowedCatalogBannerImage("http://example.com/banner.jpg")).toBe(
      false
    );
    expect(isAllowedCatalogBannerImage("https://example.com/banner.jpg")).toBe(
      false
    );
  });

  test("validates upload type and size before using the shared upload API", () => {
    expect(
      catalogBannerFileError({ type: "image/webp", size: CATALOG_BANNER_MAX_BYTES })
    ).toBeNull();
    expect(catalogBannerFileError({ type: "image/gif", size: 100 })).toBe(
      "Use a JPEG, PNG, or WebP image"
    );
    expect(
      catalogBannerFileError({
        type: "image/jpeg",
        size: CATALOG_BANNER_MAX_BYTES + 1,
      })
    ).toBe("Banner images must be 10 MB or smaller");
  });

  test("accepts any image dimensions and shows automatic crop previews", () => {
    const admin = source(
      "app/admin/(dashboard)/catalog/catalog-assignment-client.tsx"
    );

    expect(admin).toContain('apiFetch("/api/admin/upload"');
    expect(admin).toContain('formData.append("tags", "catalog-banner")');
    expect(admin).toContain("Desktop crop");
    expect(admin).toContain("Mobile crop");
    expect(admin).toContain("Any image dimensions");
    expect(admin).toContain('className="object-cover"');
    expect(admin).not.toContain("catalogBannerDimensionsError");
    expect(admin).toContain("Replace image");
    expect(admin).toContain("Clear banner");
    expect(admin).toContain("Or paste an image URL");
    expect(admin).toContain("Banner image alt text");
    expect(admin).toContain("Save the category to publish it");
  });

  test("keeps department heroes separate and leaves storefront cards untouched", () => {
    const admin = source(
      "app/admin/(dashboard)/catalog/catalog-assignment-client.tsx"
    );
    const catalogPage = source("components/catalog/catalog-page.tsx");

    expect(admin).toContain("Department roots use Hero Sections");
    expect(admin).toContain("navigation cards and");
    expect(admin).toContain("product cards are not changed");
    expect(catalogPage).toContain("isDepartmentRoot && heroSlides.length > 0");
    expect(catalogPage).toContain("!isDepartmentRoot && bannerImage");
    expect(catalogPage.indexOf("data-testid=\"catalog-node-banner\"")).toBeLessThan(
      catalogPage.indexOf("<CatalogProductResults")
    );
  });
});
