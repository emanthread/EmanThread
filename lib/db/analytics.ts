import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { parseProductImages } from "@/lib/utils/parse-images";

// ── Period helpers ──────────────────────────────────────────────

function getPeriodRange(timeRange: string) {
  const now = new Date();
  let startDate: Date;
  let prevStartDate: Date;

  switch (timeRange) {
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "1y":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(startDate.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return { startDate, prevStartDate };
}

// ── Dashboard Analytics helpers ─────────────────────────────────

export async function getRevenueOverview(timeRange: string) {
  const now = new Date();
  let startDate: Date;

  switch (timeRange) {
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "1y":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  // Push the grouping to Postgres — returns only N rows (one per month) instead of
  // downloading every order into Node.js and reducing in JavaScript.
  const rows = await prisma.$queryRaw<{ month: string; revenue: number }[]>`
    SELECT
      TO_CHAR("createdAt", 'MM') AS month,
      SUM("grandTotal")::float    AS revenue
    FROM "Order"
    WHERE "createdAt" >= ${startDate}
      AND "status" != 'CANCELLED'
    GROUP BY TO_CHAR("createdAt", 'MM')
    ORDER BY month ASC
  `;

  return rows.map((row) => ({
    month: row.month,
    revenue: Number(row.revenue),
  }));
}


export async function getTopProducts(limit: number = 5) {
  const items = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true, priceAtTimeOfPurchase: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, images: true },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  return items.map((item) => {
    const p = productMap.get(item.productId);
    return {
      name: p?.name || "Unknown Product",
      sales: item._sum.quantity || 0,
      revenue: Number(item._sum.priceAtTimeOfPurchase || 0),
      image: parseProductImages(p?.images)[0] || "/placeholder.jpg",
    };
  });
}

type ShippingAddressShape = {
  city?: string;
  address?: string;
  email?: string;
  phone?: string;
  province?: string;
  postalCode?: string;
};

export async function getAdminAnalyticsDetail(
  timeRange: string,
  fromDate?: string,
  toDate?: string
) {
  let startDate: Date;
  let prevStartDate: Date;

  if (fromDate && toDate) {
    startDate = new Date(fromDate);
    // end of toDate
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);
    const diffMs = endDate.getTime() - startDate.getTime();
    prevStartDate = new Date(startDate.getTime() - diffMs);
  } else {
    const range = getPeriodRange(timeRange);
    startDate = range.startDate;
    prevStartDate = range.prevStartDate;
  }

  // Parallelize the 4 initial queries
  const [currentOrders, prevOrders, totalCustomers, prevCustomers] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        grandTotal: true,
        createdAt: true,
        shippingAddress: true,
      },
    }),
    prisma.order.findMany({
      where: {
        createdAt: { gte: prevStartDate, lt: startDate },
        status: { not: "CANCELLED" },
      },
      select: { grandTotal: true },
    }),
    prisma.user.count({
      where: { createdAt: { lte: startDate } },
    }),
    prisma.user.count({
      where: { createdAt: { gte: prevStartDate, lt: startDate } },
    })
  ]);

  // Overview stats
  const currentRevenue = currentOrders.reduce(
    (s, o) => s + Number(o.grandTotal),
    0
  );
  const prevRevenue = prevOrders.reduce(
    (s, o) => s + Number(o.grandTotal),
    0
  );
  const totalOrders = currentOrders.length;
  const prevOrdersCount = prevOrders.length;

  const avgOrderValue = totalOrders > 0 ? currentRevenue / totalOrders : 0;
  const prevAvgOrderValue =
    prevOrdersCount > 0 ? prevRevenue / prevOrdersCount : 0;

  const calcChange = (curr: number, prev: number) =>
    prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : 0;

  // Sales by category — M5: use aggregation instead of loading all order items
  const categoryAgg = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      order: {
        createdAt: { gte: startDate },
        status: { not: "CANCELLED" },
      },
    },
    _sum: { priceAtTimeOfPurchase: true, quantity: true },
  });

  const catProductIds = categoryAgg.map((c) => c.productId);
  const catProducts = await prisma.product.findMany({
    where: { id: { in: catProductIds } },
    select: {
      id: true,
      fabricType: true,
      category: { select: { name: true } },
    },
  });
  const catProductMap = new Map(catProducts.map((p) => [p.id, p]));

  const categoryMap = new Map<string, number>();
  for (const agg of categoryAgg) {
    const p = catProductMap.get(agg.productId);
    const catName = p?.category?.name || p?.fabricType || "Other";
    categoryMap.set(
      catName,
      (categoryMap.get(catName) || 0) +
        Number(agg._sum.priceAtTimeOfPurchase ?? 0)
    );
  }
  const totalCatRevenue =
    Array.from(categoryMap.values()).reduce((s, v) => s + v, 0) || 1;
  const salesByCategory = Array.from(categoryMap.entries())
    .map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / totalCatRevenue) * 100),
    }))
    .sort((a, b) => b.value - a.value);

  // Top cities from shipping addresses
  const cityMap = new Map<string, { orders: number; revenue: number }>();
  for (const order of currentOrders) {
    const addr = order.shippingAddress as ShippingAddressShape | null;
    const city = addr?.city || "Unknown";
    const entry = cityMap.get(city) || { orders: 0, revenue: 0 };
    entry.orders += 1;
    entry.revenue += Number(order.grandTotal);
    cityMap.set(city, entry);
  }
  const topCities = Array.from(cityMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Traffic sources from PageView referrers
  let trafficSources: {
    name: string;
    count: number;
    percentage: number;
  }[] = [];
  try {
    const pageViews = await prisma.pageView.findMany({
      where: { createdAt: { gte: startDate } },
      select: { referrer: true, utmSource: true },
      take: 10_000,
      orderBy: { createdAt: "desc" },
    });

    const sourceMap = new Map<string, number>();
    let totalViews = pageViews.length;

    for (const pv of pageViews) {
      let source = "Direct";
      const ref = pv.referrer?.toLowerCase() || "";
      const utm = pv.utmSource?.toLowerCase();

      if (utm) {
        source = utm.charAt(0).toUpperCase() + utm.slice(1);
      } else if (ref.includes("google")) {
        source = "Google";
      } else if (ref.includes("facebook") || ref.includes("fb.com")) {
        source = "Facebook";
      } else if (ref.includes("instagram")) {
        source = "Instagram";
      } else if (ref.includes("twitter") || ref.includes("x.com")) {
        source = "Twitter";
      } else if (ref.includes("linkedin")) {
        source = "LinkedIn";
      } else if (ref.includes("pinterest")) {
        source = "Pinterest";
      } else if (ref.includes("youtube")) {
        source = "YouTube";
      } else if (ref && ref !== "direct") {
        source = "Other";
      }

      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    }

    trafficSources = Array.from(sourceMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage:
          totalViews > 0 ? Math.round((count / totalViews) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  } catch {
    // PageView table may not exist yet — gracefully return empty traffic sources
  }

  // Daily revenue for chart (last 7 days worth, or bucket by period)
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayMap = new Map<string, number>();
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const order of currentOrders) {
    const day = order.createdAt.toISOString().slice(0, 10);
    if (dayMap.has(day)) {
      dayMap.set(day, (dayMap.get(day) || 0) + Number(order.grandTotal));
    }
  }
  const dailyRevenue = Array.from(dayMap.entries()).map(
    ([dateStr, revenue], i) => ({
      day:
        dayLabels[i] ||
        new Date(dateStr).toLocaleDateString("en-US", {
          weekday: "short",
        }),
      revenue,
    })
  );

  return {
    overviewStats: {
      revenue: {
        value: currentRevenue,
        change: calcChange(currentRevenue, prevRevenue),
      },
      orders: {
        value: totalOrders,
        change: calcChange(totalOrders, prevOrdersCount),
      },
      customers: {
        value: totalCustomers,
        change: calcChange(totalCustomers, prevCustomers),
      },
      conversion: {
        value:
          totalOrders > 0
            ? Math.round(
                (totalOrders / Math.max(totalCustomers, 1)) * 1000
              ) / 10
            : 0,
        change: 0,
      },
    },
    trafficSources,
    salesByCategory,
    topCities,
    dailyRevenue,
  };
}

// Returns only the 4 aggregate metrics unique to analytics (revenue, orders, customers, reviews).
// Pending orders / return requests / low stock are owned by getAdminAlertCounts — no duplication.
// Recent orders are fetched on-demand via getAdminRecentOrders — not dragged in on every poll.
export async function getAdminAnalytics() {
  type AnalyticsRow = {
    totalRevenue: unknown;
    averageOrderValue: unknown;
    totalOrders: bigint;
    totalCustomers: bigint;
    totalReviews: bigint;
    averageRating: unknown;
  };

  const [row] = await prisma.$queryRaw<AnalyticsRow[]>`
    SELECT
      (SELECT COALESCE(SUM("grandTotal"), 0) FROM "Order") AS "totalRevenue",
      (SELECT COALESCE(AVG("grandTotal"), 0) FROM "Order") AS "averageOrderValue",
      (SELECT COUNT(*) FROM "Order") AS "totalOrders",
      (SELECT COUNT(*) FROM "User") AS "totalCustomers",
      (SELECT COUNT(*) FROM "ProductReview" WHERE "isVisible" = true AND "deletedAt" IS NULL) AS "totalReviews",
      (SELECT COALESCE(AVG("rating"), 0) FROM "ProductReview" WHERE "isVisible" = true AND "deletedAt" IS NULL) AS "averageRating"
  `;

  const totalRevenue = Number(row?.totalRevenue ?? 0);
  const avgOrderValue = Number(row?.averageOrderValue ?? 0);
  const totalReviews = Number(row?.totalReviews ?? 0);
  const averageRating = Number(Number(row?.averageRating ?? 0).toFixed(1));

  return {
    totalRevenue,
    revenueChange: 0,
    totalOrders: Number(row?.totalOrders ?? 0),
    ordersChange: 0,
    totalCustomers: Number(row?.totalCustomers ?? 0),
    customersChange: 0,
    averageOrderValue: avgOrderValue,
    aovChange: 0,
    totalReviews,
    averageRating,
  };
}

// Separate on-demand fetch for the dashboard Recent Orders table.
// Strict select — only fields actually rendered in the UI.
export async function getAdminRecentOrders() {
  const recentOrders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      grandTotal: true,
      status: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
      items: {
        take: 3, // Dashboard shows at most 2 thumbnails + overflow count
        select: {
          productId: true,
          quantity: true,
          priceAtTimeOfPurchase: true,
          product: { select: { name: true, images: true, sku: true } },
        },
      },
    },
  });

  return recentOrders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.user?.name || "Guest",
    customerEmail: order.user?.email || "",
    items: order.items.map((item) => ({
      productId: item.productId,
      productName: item.product?.name || "Unknown Product",
      productImage: item.product?.images
        ? parseProductImages(item.product.images)[0] || "/placeholder.jpg"
        : "/placeholder.jpg",
      quantity: item.quantity,
      price: Number(item.priceAtTimeOfPurchase),
      sku: item.product?.sku || "N/A",
    })),
    total: Number(order.grandTotal),
    status: order.status.toLowerCase() as
      | "pending"
      | "processing"
      | "shipped"
      | "delivered"
      | "cancelled"
      | "returned",
    createdAt: order.createdAt.toISOString(),
  }));
}

// Separate on-demand fetch for the dashboard Low Stock Alert card.
// Only pulls the fields the card renders — no full product payload.
// Uses a raw where clause comparing stockQuantity <= lowStockThreshold at DB level.
export async function getAdminLowStockProducts() {
  // Prisma doesn't support column-to-column comparisons in where, so we use $queryRaw
  // for the core filter but keep it simple: just fetch all inStock products with
  // stockQuantity <= lowStockThreshold (both are indexed integer columns).
  const products = await prisma.$queryRaw<
    { id: string; name: string; sku: string; images: string; stockQuantity: number; lowStockThreshold: number }[]
  >`
    SELECT id, name, sku, images, "stockQuantity", "lowStockThreshold"
    FROM "Product"
    WHERE "inStock" = true
      AND "stockQuantity" <= "lowStockThreshold"
    ORDER BY "stockQuantity" ASC
    LIMIT 20
  `;

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    images: parseProductImages(p.images),
    stockQuantity: Number(p.stockQuantity),
    lowStockThreshold: Number(p.lowStockThreshold),
  }));
}

export async function getAdminAlertCounts() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  type AlertRow = {
    newOrders: bigint;
    newOrdersLatest: Date | null;
    pendingReturns: bigint;
    pendingReturnsLatest: Date | null;
    lowStockProducts: bigint;
    lowStockLatest: Date | null;
    backlogOrders: bigint;
    backlogOrdersLatest: Date | null;
  };

  const [row] = await prisma.$queryRaw<AlertRow[]>`
    SELECT
      (SELECT COUNT(*) FROM "Order" WHERE "createdAt" >= ${oneHourAgo}) AS "newOrders",
      (SELECT MAX("createdAt") FROM "Order" WHERE "createdAt" >= ${oneHourAgo}) AS "newOrdersLatest",
      (SELECT COUNT(*) FROM "ReturnRequest" WHERE "status" = 'PENDING') AS "pendingReturns",
      (SELECT MAX("createdAt") FROM "ReturnRequest" WHERE "status" = 'PENDING') AS "pendingReturnsLatest",
      (SELECT COUNT(*) FROM "Product" WHERE "inStock" = true AND "stockQuantity" <= 5) AS "lowStockProducts",
      (SELECT MAX("updatedAt") FROM "Product" WHERE "inStock" = true AND "stockQuantity" <= 5) AS "lowStockLatest",
      (SELECT COUNT(*) FROM "Order" WHERE "status" = 'PENDING' AND "createdAt" <= ${twentyFourHoursAgo}) AS "backlogOrders",
      (SELECT MAX("createdAt") FROM "Order" WHERE "status" = 'PENDING' AND "createdAt" <= ${twentyFourHoursAgo}) AS "backlogOrdersLatest"
  `;

  const newOrders = Number(row?.newOrders ?? 0);
  const pendingReturns = Number(row?.pendingReturns ?? 0);
  const lowStockProducts = Number(row?.lowStockProducts ?? 0);
  const backlogOrders = Number(row?.backlogOrders ?? 0);

  return {
    newOrders,
    newOrdersLatest: row?.newOrdersLatest?.toISOString() || null,
    pendingReturns,
    pendingReturnsLatest: row?.pendingReturnsLatest?.toISOString() || null,
    lowStockProducts,
    lowStockLatest: row?.lowStockLatest?.toISOString() || null,
    backlogOrders,
    backlogOrdersLatest: row?.backlogOrdersLatest?.toISOString() || null,
    total: newOrders + pendingReturns + lowStockProducts + backlogOrders,
  };
}

export async function getAdminCustomers({
  page = 1,
  limit = 25,
  search = "",
  status = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
} = {}) {
  const skip = (page - 1) * limit;

  // Build where clause for server-side search + status filter
  const where: Prisma.UserWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      // Strict select on addresses — only fetch the 3 fields used in the return mapping
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isAdminCreated: true,
        createdAt: true,
        addresses: {
          select: { phone: true, city: true, isDefault: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  // Use aggregation instead of loading all orders (M3)
  const userIds = users.map((u) => u.id);
  const orderAgg = await prisma.order.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds } },
    _sum: { grandTotal: true },
    _max: { createdAt: true },
    _count: { id: true },
  });
  const aggMap = new Map(orderAgg.map((a) => [a.userId!, a]));

  const mapped = users.map((user) => {
    const agg = aggMap.get(user.id);
    const totalOrders = agg?._count.id ?? 0;
    const totalSpent = Number(agg?._sum.grandTotal ?? 0);
    const lastOrderDate = agg?._max.createdAt
      ? agg._max.createdAt.toISOString().split("T")[0]
      : user.createdAt.toISOString().split("T")[0];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone:
        user.phone ||
        user.addresses.find((a) => a.isDefault)?.phone ||
        user.addresses[0]?.phone ||
        "",
      city:
        user.addresses.find((a) => a.isDefault)?.city ||
        user.addresses[0]?.city ||
        "",
      totalOrders,
      totalSpent,
      lastOrderDate,
      status: "active" as const,
      isAdminCreated: user.isAdminCreated,
      createdAt: user.createdAt.toISOString().split("T")[0],
    };
  });

  return {
    customers: mapped,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
