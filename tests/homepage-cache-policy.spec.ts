import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

test("homepage opts out of the stale full-route cache", () => {
  const homepage = readFileSync(resolve(process.cwd(), "app/page.tsx"), "utf8");

  expect(homepage).toMatch(/^export const revalidate = 0;$/m);
});

test("homepage streams catalog products after the hero shell", () => {
  const homepage = readFileSync(resolve(process.cwd(), "components/home/department-home.tsx"), "utf8");
  const page = homepage.slice(homepage.indexOf("export async function DepartmentHome"));

  expect(homepage).toContain("async function HomepageCollections");
  expect(page).toContain("<HeroSection");
  expect(page).toContain("<Suspense fallback=");
  expect(page.indexOf("<HeroSection")).toBeLessThan(page.indexOf("<Suspense fallback="));
  expect(page).not.toContain("getCatalogPageData(");
});