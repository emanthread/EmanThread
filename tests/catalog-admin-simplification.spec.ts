import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

import { canonicalStorefrontSizeLabel } from "../components/product/product-option-picker";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("catalog admin exposes category management instead of assignment tools", () => {
  const catalog = source("app/admin/(dashboard)/catalog/catalog-assignment-client.tsx");
  const layout = source("app/admin/(dashboard)/layout.tsx");

  expect(layout).toContain('label: "Categories"');
  expect(layout).not.toContain('label: "Catalog Assignment"');
  expect(layout).not.toContain('label: "Audit Logs"');
  expect(catalog).toContain("Manage departments, categories, banners, descriptions, and storefront visibility");
  expect(catalog).toContain("Category banner (optional)");
  expect(catalog).toContain("Product assignment is handled directly inside Products");
  expect(catalog.indexOf("if (canManageCatalogPaths)"))
    .toBeLessThan(catalog.indexOf('<TabsTrigger value="assign">'));
});

test("product editor stores one category with natural placement settings", () => {
  const assignment = source("components/admin/product-catalog-assignment-section.tsx");
  expect(assignment).toContain("The simplified editor has one natural category per product");
  expect(assignment).toContain("onChange([primaryAssignment])");
  expect(assignment).toContain("isFeatured: false");
  expect(assignment).toContain("displayOrder: null");
  expect(assignment).not.toContain("Add placement");
  expect(assignment).not.toContain("Catalog display order");
});

test("storefront uses canonical size labels and crosses out unavailable values", () => {
  const picker = source("components/product/product-option-picker.tsx");
  expect(canonicalStorefrontSizeLabel("Small")).toBe("S");
  expect(canonicalStorefrontSizeLabel("Medium")).toBe("M");
  expect(canonicalStorefrontSizeLabel("Large")).toBe("L");
  expect(canonicalStorefrontSizeLabel("Extra Large")).toBe("XL");
  expect(canonicalStorefrontSizeLabel("XXL")).toBe("XXL");
  expect(picker).toContain("disabled={!available}");
  expect(picker).toContain("line-through opacity-70");
  expect(picker).toContain("Unavailable</span>");
});
