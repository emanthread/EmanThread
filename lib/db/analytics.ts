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

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: startDate },
      status: { not: "CANCELLED" },
    },
    select: {
      grandTotal: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const monthMap = new Map<string, number>();
  orders.forEach((o) => {
    const month = o.createdAt.toISOString().slice(0, 7);
    monthMap.set(month, (monthMap.get(month) || 0) + Number(o.grandTotal));
  });

  const sorted = Array.from(monthMap.entries()).sort();
  return sorted.map(([month, revenue]) => ({
    month: month.slice(5),
    revenue,
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

  // Current period orders (non-cancelled) — M5: removed items include, use aggregation instead
  const currentOrders = await prisma.order.findMany({
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
  });

  // Previous period orders (for change calculation)
  const prevOrders = await prisma.order.findMany({
    where: {
      createdAt: { gte: prevStartDate, lt: startDate },
      status: { not: "CANCELLED" },
    },
    select: { grandTotal: true },
  });

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
  const totalCustomers = await prisma.user.count({
    where: { createdAt: { lte: startDate } },
  });
  const prevCustomers = await prisma.user.count({
    where: { createdAt: { gte: prevStartDate, lt: startDate } },
  });

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

export async function getAdminAnalytics() {
  const [
    revenueAgg,
    ordersCount,
    customersCount,
    pendingOrdersCount,
    pendingReturnRequestsCount,
    recentOrders,
    reviewStats,
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: { grandTotal: true },
      _avg: { grandTotal: true },
    }),
    prisma.order.count(),
    prisma.user.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.returnRequest.count({ where: { status: "PENDING" } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      // Strict select — only fetch fields rendered in the dashboard Recent Orders table
      select: {
        id: true,
        orderNumber: true,
        grandTotal: true,
        status: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        items: {
          take: 3, // Dashboard shows at most 2 item thumbnails + overflow count
          select: {
            productId: true,
            quantity: true,
            priceAtTimeOfPurchase: true,
            product: { select: { name: true, images: true, sku: true } },
          },
        },
      },
    }),
    prisma.productReview.aggregate({
      _avg: { rating: true },
      _count: { id: true },
      where: { isVisible: true, deletedAt: null },
    }),
  ]);

  const totalRevenue = Number(revenueAgg._sum.grandTotal || 0);
  const avgOrderValue = Number(revenueAgg._avg.grandTotal || 0);
  const totalReviews = reviewStats._count.id || 0;
  const averageRating = Number(reviewStats._avg.rating?.toFixed(1) || 0);

  return {
    totalRevenue,
    revenueChange: 0,
    totalOrders: ordersCount,
    ordersChange: 0,
    totalCustomers: customersCount,
    customersChange: 0,
    averageOrderValue: avgOrderValue,
    aovChange: 0,
    pendingOrders: pendingOrdersCount,
    lowStockItems: await prisma.product.count({
      where: {
        AND: [
          { stockQuantity: { lte: 5 } },
          { stockQuantity: { gt: 0 } },
        ],
      },
    }),
    returnRequests: pendingReturnRequestsCount,
    totalReviews,
    averageRating,
    recentOrders: recentOrders.map((order) => ({
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
    })),
  };
}

export async function getAdminAlertCounts() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [
    newOrdersAgg,
    pendingReturnsAgg,
    lowStockAgg,
    backlogOrdersAgg,
  ] = await Promise.all([
    prisma.order.aggregate({
      _count: { id: true },
      _max: { createdAt: true },
      where: { createdAt: { gte: oneHourAgo } },
    }),
    prisma.returnRequest.aggregate({
      _count: { id: true },
      _max: { createdAt: true },
      where: { status: "PENDING" },
    }),
    prisma.product.aggregate({
      _count: { id: true },
      _max: { updatedAt: true },
      where: {
        AND: [{ inStock: true }, { stockQuantity: { lte: 5 } }],
      },
    }),
    prisma.order.aggregate({
      _count: { id: true },
      _max: { createdAt: true },
      where: {
        AND: [
          { status: "PENDING" },
          { createdAt: { lte: twentyFourHoursAgo } },
        ],
      },
    }),
  ]);

  const newOrders = newOrdersAgg._count.id;
  const pendingReturns = pendingReturnsAgg._count.id;
  const lowStockProducts = lowStockAgg._count.id;
  const backlogOrders = backlogOrdersAgg._count.id;

  return {
    newOrders,
    newOrdersLatest:
      newOrdersAgg._max.createdAt?.toISOString() || null,
    pendingReturns,
    pendingReturnsLatest:
      pendingReturnsAgg._max.createdAt?.toISOString() || null,
    lowStockProducts,
    lowStockLatest:
      lowStockAgg._max.updatedAt?.toISOString() || null,
    backlogOrders,
    backlogOrdersLatest:
      backlogOrdersAgg._max.createdAt?.toISOString() || null,
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
