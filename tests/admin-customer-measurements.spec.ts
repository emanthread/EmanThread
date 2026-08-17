import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("measurement list stays lightweight while actions load the complete record", () => {
  const listRoute = source("app/api/admin/customer-measurements/route.ts");
  const detailRoute = source("app/api/admin/customer-measurements/[id]/route.ts");
  const page = source("app/admin/(dashboard)/customer-measurements/page.tsx");

  expect(listRoute).toContain(
    'SELECT "id", "phone", "customer_name", "garment_type", "gender", "created_at", "updated_at"',
  );
  expect(detailRoute).toContain('SELECT * FROM "customer_measurements"');
  expect(page).toContain("const openFullRecord = useCallback(");
  expect(page).toContain(
    "`/api/admin/customer-measurements/${encodeURIComponent(id)}?${params}`",
  );
  expect(page).toContain('if (action === "view") setViewRecord(payload.record)');
  expect(page).toContain('if (action === "edit") setEditRecord(payload.record)');
  expect(page).toContain('if (action === "print") setPrintRecord(payload.record)');
  expect(page).not.toContain("onClick={() => setViewRecord(r)}");
  expect(page).not.toContain("onClick={() => setEditRecord(r)}");
  expect(page).not.toContain("onClick={() => setPrintRecord(r)}");
});

test("measurement save waits for refresh and reports failures instead of closing blank", () => {
  const page = source("app/admin/(dashboard)/customer-measurements/page.tsx");

  expect(page).toContain("const res = await adminFetch(url");
  expect(page).toContain("await onSaved()");
  expect(page).toContain("await fetchRecords(\"\", 1)");
  expect(page).toContain('title: "Measurements saved"');
  expect(page).toContain('title: "Could not load measurements"');
});

test("measurement APIs bypass HTTP and service-worker caches", () => {
  const listRoute = source("app/api/admin/customer-measurements/route.ts");
  const detailRoute = source("app/api/admin/customer-measurements/[id]/route.ts");
  const worker = source("app/sw.ts");

  expect(listRoute).toContain("private, no-store, max-age=0");
  expect(detailRoute).toContain("private, no-store, max-age=0");
  expect(worker).toContain('pathname === "/api/admin/customer-measurements"');
  expect(worker).toContain(
    'pathname.startsWith("/api/admin/customer-measurements/")',
  );
  expect(worker.indexOf("sameOrigin && isNeverCachedApi(pathname)")).toBeLessThan(
    worker.indexOf("...defaultCache"),
  );
});
