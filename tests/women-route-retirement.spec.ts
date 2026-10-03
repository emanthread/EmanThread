import { expect, test } from "@playwright/test";
import {
  catalogSearchHref,
  publicCatalogHref,
  retiredWomenRootDestination,
} from "../lib/navigation/storefront-routes";

test.describe("retired Women catalog root", () => {
  test("opens the current homepage for a plain Women URL", () => {
    expect(retiredWomenRootDestination({})).toBe("/");
    expect(retiredWomenRootDestination({ utm_source: "email" })).toBe(
      "/?utm_source=email"
    );
  });

  test("keeps existing product searches and filters on the all-products page", () => {
    expect(retiredWomenRootDestination({ q: "linen", sort: "trending" })).toBe(
      "/shop?q=linen&sort=trending"
    );
    expect(retiredWomenRootDestination({ category: ["one", "two"] })).toBe(
      "/shop?category=one&category=two"
    );
    expect(catalogSearchHref("/checkout", "blue suit")).toBe(
      "/shop?q=blue%20suit"
    );
    expect(catalogSearchHref("/women/ready-to-wear", "blue suit")).toBe(
      "/shop?q=blue%20suit"
    );
    expect(publicCatalogHref("/women")).toBe("/shop");
    expect(publicCatalogHref("/women?season=Summer")).toBe("/shop?season=Summer");
    expect(publicCatalogHref("/women/ready-to-wear")).toBe("/women/ready-to-wear");
  });
});
