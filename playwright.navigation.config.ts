import { defineConfig } from "@playwright/test";

/**
 * Static catalog-navigation checks.
 *
 * This intentionally has no webServer, baseURL, browser project, or database
 * setup. Keep database-backed application tests in the main Playwright config.
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: [
    "navigation.spec.ts",
    "product-classification.spec.ts",
    "product-admin-policy.spec.ts",
    "product-editor-serialization.spec.ts",
    "deployment-database-safety.spec.ts",
    "storefront-catalog-ux.spec.ts",
    "catalog-header-cards.spec.ts",
    "unstitched-commerce.spec.ts",
    "product-variant-matrix.spec.ts",
    "catalog-visibility-toggle.spec.ts",
    "catalog-banner-admin.spec.ts",
    "kids-size-guide.spec.ts",
  ],
  fullyParallel: true,
  workers: 1,
  reporter: "list",
});
