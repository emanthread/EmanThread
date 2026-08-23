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
    "catalog-published-navigation.spec.ts",
    "chatbot-email-modernization.spec.ts",
    "email-delivery-compliance.spec.ts",
    "stitching-profile-flow.spec.ts",
    "measurement-print-background.spec.ts",
    "build-font-resilience.spec.ts",
    "storefront-performance.spec.ts",
    "admin-performance.spec.ts",
    "admin-product-catalog-filter.spec.ts",
    "review-admin-freshness.spec.ts",
    "admin-customer-measurements.spec.ts",
    "product-sku-generation.spec.ts",
    "product-option-admin-simplification.spec.ts",
    "admin-commerce-reliability.spec.ts",
  ],
  fullyParallel: true,
  workers: 1,
  reporter: "list",
});
