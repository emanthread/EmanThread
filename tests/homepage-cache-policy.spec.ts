import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

test("homepage opts out of the stale full-route cache", () => {
  const homepage = readFileSync(resolve(process.cwd(), "app/page.tsx"), "utf8");

  expect(homepage).toMatch(/^export const revalidate = 0;$/m);
});
