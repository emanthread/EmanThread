"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  ArrowRight,
  Clock,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  MessageSquare,
  Star,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminStore } from "@/lib/admin-store";
import { formatPrice } from "@/lib/data";
import { cn } from "@/lib/utils";

const orderStatusColors = {
  pending: "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  returned: "bg-gray-100 text-gray-700",
};

export default function AdminDashboard() {
  const {
    stats,
    statsError,
    orders,
    products,
    revenueOverview,
    topProducts,
    loadStats,
    loadOrders,
    loadProducts,
    loadRevenueOverview,
    loadTopProducts,
  } = useAdminStore();

  const [timeRange, setTimeRange] = useState("7d");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    loadStats();
    loadOrders();
    loadProducts();
    loadTopProducts();
  }, [loadStats, loadOrders, loadProducts, loadTopProducts]);

  useEffect(() => {
    if (timeRange !== "custom") {
      loadRevenueOverview(timeRange);
    }
  }, [timeRange, loadRevenueOverview]);

  const handleCustomDate = useCallback(() => {
    setTimeRange("custom");
    loadRevenueOverview("7d"); // fall back to 7d for the chart since revenue API doesn't support custom dates
  }, [loadRevenueOverview]);

  // Real-time dashboard polling (Gap 6)
  useEffect(() => {
    const interval = setInterval(() => {
      loadStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadStats]);

  // A4.5: Dashboard with stats error banner (from mount or after loading)
  const [showLoadError, setShowLoadError] = useState(false);
  useEffect(() => {
    if (stats.totalRevenue === 0 && stats.totalOrders === 0 && stats.totalCustomers === 0) {
      const timer = setTimeout(() => setShowLoadError(true), 5000); // Show after 5s if still zeros
      return () => clearTimeout(timer);
    }
    setShowLoadError(false);
  }, [stats]);

  const statCards = [
    {
      title: "Total Revenue",
      value: formatPrice(stats.totalRevenue),
      change: stats.revenueChange,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders.toString(),
      change: stats.ordersChange,
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers.toString(),
      change: stats.customersChange,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Avg. Order Value",
      value: formatPrice(stats.averageOrderValue),
      change: stats.aovChange,
      icon: Package,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
  ];

  // Payment queue state
  const [paymentQueueStats, setPaymentQueueStats] = useState({ pending: 0, flagged: 0 });

  useEffect(() => {
    fetch("/api/admin/payments/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setPaymentQueueStats(data);
      })
      .catch(() => {});
  }, []);

  const alerts = [
    {
      type: "orders",
      icon: Clock,
      title: "Pending Orders",
      count: stats.pendingOrders,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      href: "/admin/orders?status=pending",
    },
    {
      type: "payments",
      icon: CreditCard,
      title: "Payment Queue",
      count: paymentQueueStats.pending,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      href: "/admin/payment-verification",
    },
    {
      type: "stock",
      icon: AlertTriangle,
      title: "Low Stock Items",
      count: stats.lowStockItems,
      color: "text-red-600",
      bgColor: "bg-red-100",
      href: "/admin/products?filter=low-stock",
    },
    {
      type: "returns",
      icon: RefreshCw,
      title: "Return Requests",
      count: stats.returnRequests,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      href: "/admin/returns",
    },
    {
      type: "reviews",
      icon: MessageSquare,
      title: "Total Reviews",
      count: stats.totalReviews,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      href: "/admin/reviews",
    },
  ];

  const maxRevenue = revenueOverview.length > 0
    ? Math.max(...revenueOverview.map((d) => d.revenue))
    : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard Overview</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your store.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
          <Select value={timeRange} onValueChange={(val) => { setTimeRange(val); if (val !== "custom") { setFromDate(""); setToDate(""); } }}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          {timeRange === "custom" && (
            <>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-32 h-9 text-xs px-2 border border-border rounded-md bg-background"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-32 h-9 text-xs px-2 border border-border rounded-md bg-background"
              />
            </>
          )}
        </div>
      </div>

      {/* A4.5: Error banner when stats fail to load */}
      {(statsError || showLoadError) && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
          {statsError || "Data may not have loaded. Check your connection and try refreshing."}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1 text-sm font-medium",
                    stat.change >= 0 ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {stat.change >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {Math.abs(stat.change)}%
                </div>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {alerts.map((alert) => (
          <Link key={alert.type} href={alert.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={cn("p-3 rounded-full", alert.bgColor)}>
                  <alert.icon className={cn("h-5 w-5", alert.color)} />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold">{alert.count}</p>
                  <p className="text-sm text-muted-foreground">{alert.title}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Revenue for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueOverview.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No revenue data for this period
              </div>
            ) : (
            <div className="h-64 flex items-end gap-4 overflow-x-auto pb-2">
              {revenueOverview.map((data) => (
                <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center">
                    <span className="text-sm font-medium mb-1">
                      {formatPrice(data.revenue).replace("PKR ", "")}
                    </span>
                <div
                  className="w-full bg-primary/80 rounded-t-md transition-all duration-500 hover:bg-primary"
                  style={{
                    height: `${maxRevenue > 0 ? (data.revenue / maxRevenue) * 180 : 0}px`,
                  }}
                />
                  </div>
                  <span className="text-sm text-muted-foreground">{data.month}</span>
                </div>
              ))}
            </div>
            )}
          </CardContent>
        </Card>

        {/* Reviews Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Reviews Summary</CardTitle>
            <CardDescription>Customer feedback overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <Star className="h-10 w-10 mx-auto mb-3 text-yellow-400 fill-yellow-400" />
              <p className="text-4xl font-bold">{stats.averageRating || "—"}</p>
              <p className="text-muted-foreground mt-1">Average Rating</p>
              <p className="text-sm text-muted-foreground mt-2">
                Based on {stats.totalReviews} review{stats.totalReviews !== 1 ? "s" : ""}
              </p>
              <Button variant="outline" size="sm" asChild className="mt-4">
                <Link href="/admin/reviews">
                  Manage Reviews
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
          <CardDescription>Best selling products this month</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {topProducts.map((product, index) => (
            <div key={product.name} className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground w-5">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {product.sales} sales
                </p>
              </div>
              <span className="text-sm font-medium">
                {formatPrice(product.revenue)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders from your store</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/orders">
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                    Order
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                    Customer
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground hidden sm:table-cell">
                    Items
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                    Total
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground hidden sm:table-cell">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-sm font-medium text-accent hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-2">
                      <div>
                        <p className="text-sm font-medium">{order.customerName}</p>
                        <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                      </div>
                    </td>
                    <td className="py-3 px-2 hidden sm:table-cell">
                      <div className="flex items-center gap-1">
                        {order.items.slice(0, 2).map((item, i) => (
                          <div
                            key={i}
                            className="relative h-8 w-8 rounded overflow-hidden bg-muted"
                          >
                            <Image
                              src={item.productImage}
                              alt={item.productName}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{order.items.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-sm font-medium">{formatPrice(order.total)}</span>
                    </td>
                    <td className="py-3 px-2">
                      <Badge
                        variant="secondary"
                        className={cn("capitalize", orderStatusColors[order.status])}
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Low Stock Alert</CardTitle>
            <CardDescription>Products that need restocking</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/products?filter=low-stock">
              Manage Stock
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {products
              .filter((p) => p.stockQuantity <= p.lowStockThreshold)
              .map((product) => (
                <div key={product.id} className="flex items-center gap-4">
                  <div className="relative h-12 w-12 rounded overflow-hidden bg-muted">
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">
                      {product.stockQuantity} left
                    </p>
                    <Progress
                      value={(product.stockQuantity / product.lowStockThreshold) * 100}
                      className="w-24 h-1.5"
                    />
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
