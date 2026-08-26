import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import {
  calculateShippingCost,
  selectShippingZone,
  type ShippingZoneCandidate,
} from "../lib/shipping-quote";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const zones: ShippingZoneCandidate[] = [
  {
    id: "lahore",
    name: "Lahore",
    cities: ["lahore"],
    provinces: ["punjab"],
    shippingRate: 150,
    estimatedDays: "1-2 business days",
  },
  {
    id: "sindh",
    name: "Sindh Province",
    cities: [],
    provinces: ["sindh"],
    shippingRate: 275,
    estimatedDays: "3-4 business days",
  },
  {
    id: "default",
    name: "Rest of Pakistan",
    cities: [],
    provinces: [],
    shippingRate: 350,
    estimatedDays: "3-5 business days",
  },
];

test("shipping zones resolve exact city, province-wide, then default", () => {
  expect(selectShippingZone(zones, " Lahore ", "Punjab")?.id).toBe("lahore");
  expect(selectShippingZone(zones, "Hyderabad", "SINDH")?.id).toBe("sindh");
  // A city-specific Punjab zone must not become a province-wide match.
  expect(selectShippingZone(zones, "Rawalpindi", "Punjab")?.id).toBe("default");
});

test("delivery charges apply unless free shipping is explicitly enabled", () => {
  expect(calculateShippingCost({
    subtotal: 11_001,
    baseRate: 350,
    enableFreeShipping: false,
    freeShippingThreshold: 5_000,
  })).toEqual({ shippingCost: 350, freeShippingApplied: false });

  expect(calculateShippingCost({
    subtotal: 5_000,
    baseRate: 350,
    enableFreeShipping: true,
    freeShippingThreshold: 5_000,
  })).toEqual({ shippingCost: 0, freeShippingApplied: true });

  expect(calculateShippingCost({
    subtotal: 5_000,
    baseRate: 350,
    enableFreeShipping: true,
    freeShippingThreshold: 0,
  })).toEqual({ shippingCost: 350, freeShippingApplied: false });
});

test("checkout preview and order persistence share one authoritative quote", () => {
  const checkout = source("app/checkout/page.tsx");
  expect(checkout).toContain("/api/shipping/zone?");
  expect(checkout).toContain("shippingQuoteRetry");
  expect(checkout).toContain("Retry delivery calculation");
  expect(source("app/api/shipping/zone/route.ts")).toContain("getShippingQuote");
  expect(source("app/api/orders/route.ts")).toContain("getShippingQuote({");
  expect(source("lib/db/shipping.ts")).toContain("deletedAt: null");
  expect(source("lib/db/shipping.ts")).toContain(
    "data: { deletedAt: new Date(), isActive: false }",
  );
});

test("delivery messaging follows configuration instead of promising a fixed free threshold", () => {
  const customerCopy = [
    source("components/home/promo-section.tsx"),
    source("app/api/promo-banner/route.ts"),
    source("app/shipping/page.tsx"),
    source("app/faqs/page.tsx"),
    source("app/product/[id]/product-page-client.tsx"),
  ].join("\n");
  const chatContext = source("lib/chat-db-search.ts");

  expect(customerCopy).not.toContain("Shipping Over PKR 5,000");
  expect(customerCopy).not.toContain("Free standard shipping on orders over PKR 5,000");
  expect(chatContext).toContain("deletedAt: null");
  expect(chatContext).toContain("config.enableFreeShipping");
});

test("mobile checkout and cart preserve choices and expose usable controls", () => {
  const checkout = source("app/checkout/page.tsx");
  const cart = source("app/cart/page.tsx");

  expect(checkout).toContain("previousItemIdsRef");
  expect(checkout).toContain('aria-live="polite"');
  expect(checkout).toContain("this checkout`}");
  expect(cart).toContain("grid grid-cols-2");
  expect(cart).toContain("lg:sticky lg:top-28");
  expect(cart).toContain("Decrease quantity of");
  expect(cart).toContain("Increase quantity of");
});

test("PostgreSQL advisory locks never project the void return value", () => {
  const orders = source("lib/db/orders.ts");
  expect(orders).toContain('SELECT TRUE AS "locked"');
  expect(orders).toContain("FROM pg_advisory_xact_lock");
  expect(orders).not.toMatch(/SELECT\s+pg_advisory_xact_lock/);
  expect(orders).toContain("maxWait: 5_000");
  expect(orders).toContain("timeout: 15_000");
});

test("catalog renames preserve stable URLs and hide internal leaf wording", () => {
  const menu = source("lib/navigation/catalog-menu.ts");
  const catalogPage = source("components/catalog/catalog-page.tsx");
  const assignmentEditor = source("components/admin/product-catalog-assignment-section.tsx");

  expect(menu).toContain('label: "MEDIUM CLASS", href: "/men/unstitched/latha"');
  expect(menu).toContain('label: "COTTON COLLECTION", href: "/men/unstitched/boski"');
  expect(catalogPage).not.toContain("data.node.nodeType");
  expect(assignmentEditor).not.toContain("leaf category");
});
