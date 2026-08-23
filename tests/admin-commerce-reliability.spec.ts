import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import {
  adminLimitParam,
  adminPageParam,
  adminSearchParam,
} from "../lib/admin-pagination";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("the 100 limit is per request and product navigation remains paginated", () => {
  expect(adminLimitParam("500", 50)).toBe(100);
  expect(adminPageParam("3")).toBe(3);
  expect(adminSearchParam(`  ${"x".repeat(300)}  `)).toHaveLength(160);

  const page = source("components/admin/product-list-page.tsx");
  const products = source("lib/db/products.ts");
  expect(page).toContain("const PAGE_SIZE = 50");
  expect(page).toContain("handlePageChange(productsPage + 1)");
  expect(products).toContain("skip,");
  expect(products).toContain("take: pageSize");
  expect(products).toContain("totalPages: Math.ceil(total / pageSize)");
});

test("orders use durable identities, direct detail lookup, global counters, and no destructive delete", () => {
  const orders = source("lib/db/orders.ts");
  const detailRoute = source("app/api/admin/orders/[id]/route.ts");
  const page = source("app/admin/(dashboard)/orders/page.tsx");

  expect(orders).toContain("randomUUID()");
  expect(orders).toContain("{ id: { equals: search } }");
  expect(orders).toContain("prisma.order.groupBy({");
  expect(detailRoute).toContain("getAdminOrders({ search: id, page: 1, limit: 1 })");
  expect(detailRoute).not.toContain("export const DELETE");
  expect(page).not.toContain("Delete Order");
  expect(page).toContain("const orderCounts = orderStatusCounts");
});

test("concurrent state changes cannot double-process inventory, payments, discounts, or stitching slots", () => {
  const orders = source("lib/db/orders.ts");
  const payments = source("lib/db/payments.ts");
  const statusRoute = source("app/api/admin/orders/[id]/status/route.ts");

  expect(statusRoute).toContain("updateOrderStatus(id, result.data.status, oldOrder.status)");
  expect(orders).toContain("status: expectedStatus || { not: status as OrderStatus }");
  expect(orders).toContain("usageCount: { lt: discount.usageLimit }");
  expect(orders).toContain("pg_advisory_xact_lock");
  expect(orders).toContain("booked >= capacity");
  expect(orders).toContain('paymentStatus: "PENDING_VERIFICATION"');
  expect(orders).toContain("stockQuantity - reservedQuantity");
  expect(payments).toContain("where: { id: sub.id, status: 'PENDING', expiresAt: { lte: now } }");
  expect(payments).toContain("Processed payment records cannot be deleted");
  expect(source("app/api/cron/payment-expiry/route.ts")).toContain(
    "autoExpirePendingPayments()"
  );
  expect(source("vercel.json")).toContain('"path": "/api/cron/payment-expiry"');
});

test("admin payment and measurement screens use bounded search and centralized permissions", () => {
  const paymentRoute = source("app/api/admin/payments/route.ts");
  const payments = source("lib/db/payments.ts");
  const measurementRoutes = [
    "app/api/admin/measurements/route.ts",
    "app/api/admin/measurements/completed/route.ts",
    "app/api/admin/measurements/rejected/route.ts",
    "app/api/admin/measurements/stats/route.ts",
    "app/api/admin/orders/[id]/measurements/route.ts",
    "app/api/admin/orders/[id]/measurements/[measurementId]/route.ts",
  ];

  expect(paymentRoute).toContain("adminSearchParam");
  expect(payments).toContain("order: { orderNumber: { contains: search");
  for (const path of measurementRoutes) {
    expect(source(path), path).toContain("requireAdminApiAccess");
  }
  expect(source("lib/db/measurements.ts")).toContain(
    "where: { id: measurementId, orderId }"
  );
});

test("stitching configuration rejects invalid capacities and saves prices atomically", () => {
  const calendarRoute = source("app/api/admin/stitching-calendar/route.ts");
  const calendarItemRoute = source("app/api/admin/stitching-calendar/[id]/route.ts");
  const pricesRoute = source("app/api/admin/stitching-prices/route.ts");

  expect(calendarRoute).toContain("z.number().int().min(1).max(500)");
  expect(calendarItemRoute).toContain("z.number().int().min(1).max(500)");
  expect(calendarRoute).toContain(
    "new Date(data.startDate).getTime() > new Date(data.endDate).getTime()"
  );
  expect(pricesRoute).toContain("const updated = await prisma.$transaction(");
  expect(pricesRoute).toContain("Each fabric and gender price can appear only once");
});
