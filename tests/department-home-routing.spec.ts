import { expect, test } from "@playwright/test";
import { departmentHomepageHref, isDepartmentListingRequest, publicCatalogHref, catalogSearchHref } from "../lib/navigation/storefront-routes";

test("all department entry links select a current department homepage", () => {
  expect(departmentHomepageHref("women")).toBe("/");
  expect(departmentHomepageHref("men")).toBe("/men");
  expect(departmentHomepageHref("teens")).toBe("/teens");
  expect(departmentHomepageHref("fragrance-beauty")).toBe("/fragrance-beauty");
});

test("tracking parameters cannot turn a department homepage into a product grid", () => {
  expect(isDepartmentListingRequest({})).toBe(false);
  expect(isDepartmentListingRequest({ utm_source: "newsletter", gclid: "123" })).toBe(false);
  expect(isDepartmentListingRequest({ q: "" })).toBe(false);
  for (const key of ["q", "fabric", "category", "color", "season", "kind", "option", "minPrice", "maxPrice", "inStock", "sort", "page"]) {
    expect(isDepartmentListingRequest({ [key]: "1" })).toBe(true);
  }
  expect(isDepartmentListingRequest({ view: "all" })).toBe(true);
  expect(isDepartmentListingRequest({ view: "unknown" })).toBe(false);
});

test("SEE ALL links retain full inventories without reopening a department landing", () => {
  expect(publicCatalogHref("/women")).toBe("/shop?view=all");
  expect(publicCatalogHref("/shop")).toBe("/shop?view=all");
  expect(publicCatalogHref("/men")).toBe("/men?view=all");
  expect(publicCatalogHref("/teens")).toBe("/teens?view=all");
  expect(publicCatalogHref("/fragrance-beauty")).toBe("/fragrance-beauty?view=all");
  expect(publicCatalogHref("/women?category=one&category=two&page=2")).toBe("/shop?category=one&category=two&page=2&view=all");
  expect(publicCatalogHref("/women/ready-to-wear")).toBe("/women/ready-to-wear");
  expect(publicCatalogHref("/men?view=all")).toBe("/men?view=all");
});

test("empty search still opens the full inventory", () => {
  expect(catalogSearchHref("/men", " ")).toBe("/men?view=all");
  expect(catalogSearchHref("/", "")).toBe("/shop?view=all");
});
