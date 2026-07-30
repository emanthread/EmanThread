import { defineConfig } from "@playwright/test";

/**
 * Static catalog-navigation checks.
 *
 * This intentionally has no webServer, baseURL, browser project, or database
 * setup. Keep database-backed application tests in the main Playwright config.
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: ["navigation.spec.ts"],
  fullyParallel: true,
  workers: 1,
  reporter: "list",
});
