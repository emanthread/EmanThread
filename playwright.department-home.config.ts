import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "catalog-department-heroes.spec.ts",
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.STOREFRONT_TEST_URL || "http://localhost:3100",
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
  },
});
