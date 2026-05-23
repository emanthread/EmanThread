"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  DollarSign,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/data";
import { cn } from "@/lib/utils";

interface OverviewStat {
  value: number;
  change: number;
}

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
}

interface CityData {
  name: string;
  orders: number;
  revenue: number;
}

interface TrafficSource {
  name: string;
  count: number;
  percentage: number;
}

interface DailyRevenue {
  day: string;
  revenue: number;
}

interface AnalyticsData {
  overviewStats: {
    revenue: OverviewStat;
    orders: OverviewStat;
    customers: OverviewStat;
    conversion: OverviewStat;
  };
  trafficSources: TrafficSource[];
  salesByCategory: CategoryData[];
  topCities: CityData[];
  dailyRevenue: DailyRevenue[];
}

export default function AdminAnalyticsPage() {
  const [timeRange, setTimeRange] = useState("7d");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (range: string, from?: string, to?: string) => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/admin/analytics/detail?timeRange=${range}`;
      if (from && to) url += `&fromDate=${from}&toDate=${to}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Failed to load analytics");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  const buildQuery = useCallback((range: string, from?: string, to?: string) => {
    let url = `/api/admin/analytics/detail?timeRange=${range}`;
    if (from && to) url += `&fromDate=${from}&toDate=${to}`;
    return url;
  }, []);

  useEffect(() => {
    fetchData(timeRange, fromDate || undefined, toDate || undefined);
  }, [timeRange, fromDate, toDate, fetchData]);

  const handleRefresh = () => {
    fetchData(timeRange, fromDate || undefined, toDate || undefined);
  };

  const handleCustomDate = () => {
    setTimeRange("custom");
    fetchData("custom", fromDate, toDate);
  };

  const maxRevenue = data?.dailyRevenue?.length
    ? Math.max(...data.dailyRevenue.map((d) => d.revenue))
    : 1;

  const overviewCards = data
    ? [
        {
          title: "Total Revenue",
          value: formatPrice(data.overviewStats.revenue.value),
          change: data.overviewStats.revenue.change,
          icon: DollarSign,
          color: "text-emerald-600",
          bgColor: "bg-emerald-100",
        },
        {
          title: "Total Orders",
          value: data.overviewStats.orders.value.toString(),
          change: data.overviewStats.orders.change,
          icon: ShoppingCart,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
        },
        {
          title: "Total Customers",
          value: data.overviewStats.customers.value.toString(),
          change: data.overviewStats.customers.change,
          icon: Users,
          color: "text-purple-600",
          bgColor: "bg-purple-100",
        },
        {
          title: "Conversion Rate",
          value: `${data.overviewStats.conversion.value}%`,
          change: data.overviewStats.conversion.change,
          icon: Eye,
          color: "text-amber-600",
          bgColor: "bg-amber-100",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-muted-foreground">
            Track your store performance and insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={timeRange}
            onValueChange={(val) => {
              setTimeRange(val);
              if (val !== "custom") {
                setFromDate("");
                setToDate("");
              }
            }}
          >
            <SelectTrigger className="w-40">
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
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-36 h-9 text-xs"
              />
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-36 h-9 text-xs"
              />
              <Button variant="default" size="sm" onClick={handleCustomDate} disabled={!fromDate || !toDate}>
                Apply
              </Button>
            </>
          )}
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-destructive font-medium mb-2">Failed to load analytics</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      ) : data ? (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {overviewCards.map((card) => (
              <Card key={card.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn("p-2 rounded-lg", card.bgColor)}>
                      <card.icon className={cn("h-5 w-5", card.color)} />
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "gap-1",
                        card.change >= 0
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      )}
                    >
                      {card.change >= 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {Math.abs(card.change)}%
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Daily Revenue</CardTitle>
                <CardDescription>Revenue breakdown for the past week</CardDescription>
              </CardHeader>
              <CardContent>
                {data.dailyRevenue.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No revenue data for this period
                  </div>
                ) : (
                  <div className="h-64 flex items-end gap-4">
                    {data.dailyRevenue.map((item) => (
                      <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatPrice(item.revenue).replace("PKR ", "")}
                        </span>
                        <div
                          className="w-full bg-primary/80 rounded-t-md transition-all duration-500 hover:bg-primary cursor-pointer"
                          style={{
                            height: `${maxRevenue > 0 ? (item.revenue / maxRevenue) * 180 : 0}px`,
                          }}
                        />
                        <span className="text-sm text-muted-foreground">{item.day}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sales by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Sales by Category</CardTitle>
                <CardDescription>Revenue distribution by fabric type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.salesByCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No sales data for this period
                  </p>
                ) : (
                  data.salesByCategory.map((category) => (
                    <div key={category.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{category.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatPrice(category.value)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={category.percentage} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {category.percentage}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Cities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Cities</CardTitle>
                <CardDescription>Orders and revenue by city</CardDescription>
              </CardHeader>
              <CardContent>
                {data.topCities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No order data for this period
                  </p>
                ) : (
                  <div className="space-y-4">
                    {data.topCities.map((city, index) => (
                      <div key={city.name} className="flex items-center gap-4">
                        <span className="text-sm font-medium text-muted-foreground w-5">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium">{city.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {city.orders} orders
                          </p>
                        </div>
                        <span className="font-medium">{formatPrice(city.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Traffic Sources */}
            <Card>
              <CardHeader>
                <CardTitle>Traffic Sources</CardTitle>
                <CardDescription>Where your visitors come from</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!data.trafficSources || data.trafficSources.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No traffic data yet. Page views will appear here after visitors browse the site.
                  </div>
                ) : (
                  data.trafficSources.map((source) => (
                    <div key={source.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{source.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {source.count} ({source.percentage}%)
                        </span>
                      </div>
                      <Progress value={source.percentage} className="h-2" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}