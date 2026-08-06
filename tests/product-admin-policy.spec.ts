import { expect, test } from "@playwright/test";
import { canAccessAdminApi } from "../lib/admin-api-security";

test.describe("product admin permissions", () => {
  test("product managers can save products and upload their required media", () => {
    expect(
      canAccessAdminApi("/api/admin/products/editor", "POST", "MANAGER")
    ).toBe(true);
    expect(canAccessAdminApi("/api/admin/upload", "POST", "MANAGER")).toBe(
      true
    );
  });

  test("custom manage-only product access can load the editor dependencies", () => {
    const manageOnly = ["MANAGE_PRODUCTS"];
    expect(
      canAccessAdminApi(
        "/api/admin/products/example",
        "GET",
        "SUPPORT",
        manageOnly
      )
    ).toBe(true);
    expect(
      canAccessAdminApi(
        "/api/admin/categories",
        "GET",
        "SUPPORT",
        manageOnly
      )
    ).toBe(true);
    expect(
      canAccessAdminApi(
        "/api/admin/fabric-types",
        "GET",
        "SUPPORT",
        manageOnly
      )
    ).toBe(true);
  });

  test("catalog structure is readable by product managers but writable only with settings access", () => {
    expect(
      canAccessAdminApi("/api/admin/catalog/nodes", "GET", "MANAGER")
    ).toBe(true);
    expect(
      canAccessAdminApi("/api/admin/catalog/nodes", "POST", "MANAGER")
    ).toBe(false);
    expect(
      canAccessAdminApi("/api/admin/catalog/nodes", "POST", "ADMIN")
    ).toBe(true);
  });

  test("view-only product staff cannot mutate products or uploads", () => {
    expect(
      canAccessAdminApi("/api/admin/products/editor", "POST", "SUPPORT")
    ).toBe(false);
    expect(canAccessAdminApi("/api/admin/upload", "POST", "SUPPORT")).toBe(
      false
    );
  });
});
