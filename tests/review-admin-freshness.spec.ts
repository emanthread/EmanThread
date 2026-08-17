import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("review APIs are never served from the service-worker API cache", () => {
  const worker = source("app/sw.ts");
  const reviewRule = worker.indexOf("sameOrigin && isNeverCachedApi(pathname)");
  const defaultRules = worker.indexOf("...defaultCache");

  expect(worker).toContain("new NetworkOnly()");
  expect(reviewRule).toBeGreaterThan(-1);
  expect(defaultRules).toBeGreaterThan(reviewRule);
});

test("admin review loading always bypasses stale browser caches", () => {
  const page = source("app/admin/(dashboard)/reviews/page.tsx");

  expect(page).toContain('params.set("_t", String(Date.now()))');
  expect(page).toContain('cache: "no-store"');
  expect(page).toContain("adminFetch(`/api/admin/reviews?");
});

test("admin receives visible and hidden active reviews with no-store responses", () => {
  const adminRoute = source("app/api/admin/reviews/route.ts");
  const userRoute = source("app/api/user/reviews/route.ts");
  const storefrontRoute = source("app/api/products/[id]/reviews/route.ts");

  expect(adminRoute).toContain("where.deletedAt = null");
  expect(adminRoute).not.toContain("where.isVisible");
  expect(adminRoute).toContain('"Cache-Control": "private, no-store, max-age=0"');
  expect(userRoute).toContain('"Cache-Control": "private, no-store, max-age=0"');
  expect(storefrontRoute).toContain('"Cache-Control": "no-store, max-age=0"');
});
