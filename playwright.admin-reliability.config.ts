import { defineConfig, devices } from "@playwright/test";

// All API traffic is mocked. The server also receives an unreachable local
// database and a test-only auth secret so no live account or product is used.
export default defineConfig({
  testDir: "./tests",
  testMatch: "admin-editor-reliability.spec.ts",
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3101",
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --webpack --port 3101",
    url: "http://localhost:3101/admin/login",
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      AUTH_SECRET: "local-admin-regression-secret-never-use-in-production",
      NEXTAUTH_SECRET: "local-admin-regression-secret-never-use-in-production",
      AUTH_URL: "http://localhost:3101",
      NEXTAUTH_URL: "http://localhost:3101",
      AUTH_TRUST_HOST: "true",
      DATABASE_URL: "postgresql://test:test@127.0.0.1:1/test?connect_timeout=1",
      DIRECT_URL: "postgresql://test:test@127.0.0.1:1/test?connect_timeout=1",
      NEXT_PUBLIC_CATALOG_ADMIN_ASSIGNMENTS_V1: "",
      NEXT_PUBLIC_COMMERCE_PROFILE_V1: "false",
    },
  },
});
