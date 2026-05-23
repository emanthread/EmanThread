"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tag,
  Settings,
  BarChart3,
  Bell,
  Search,
  Menu,
  LogOut,
  ChevronLeft,
  ClipboardList,
  Mail,
  Ruler,
  CreditCard,
  ImageIcon,
  Activity,
  Truck,
  MessageSquare,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/lib/auth-store";
import { useAdminStore } from "@/lib/admin-store";
import { useAdminPushNotifications } from "@/hooks/use-admin-push-notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { isStaffRole, hasPermission, Permission, type RoleValue } from "@/lib/permissions";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/orders", icon: ShoppingCart, label: "Orders", badge: "12" },
  { href: "/admin/products", icon: Package, label: "Products" },
  { href: "/admin/customers", icon: Users, label: "Customers" },
  { href: "/admin/discounts", icon: Tag, label: "Discounts" },
  { href: "/admin/returns", icon: BarChart3, label: "Returns" },
  { href: "/admin/payment-verification", icon: CreditCard, label: "Payments" },
  { href: "/admin/measurements", icon: Ruler, label: "Stitching" },
  { href: "/admin/audit-logs", icon: ClipboardList, label: "Audit Logs" },
  { href: "/admin/newsletter", icon: Mail, label: "Newsletter" },
  { href: "/admin/media-library", icon: ImageIcon, label: "Media Library" },
  { href: "/admin/monitoring", icon: Activity, label: "Monitoring" },
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/admin/shipping", icon: Truck, label: "Shipping" },
  { href: "/admin/hero-slides", icon: ImageIcon, label: "Hero Slider" },
  { href: "/admin/reviews", icon: MessageSquare, label: "Reviews" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useAdminStore();

  // Alert counts state + polling — must be before any conditional return
  const [alertCounts, setAlertCounts] = useState({
    newOrders: 0,
    pendingReturns: 0,
    lowStockProducts: 0,
    backlogOrders: 0,
    total: 0,
  });

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/alerts");
      if (!res.ok) return;
      const data = await res.json();
      setAlertCounts(data);
    } catch (err) {
      console.error("Failed to load alerts:", err);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Mount browser push notification hook for admin payment alerts
  useAdminPushNotifications();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Server-side auth is handled by middleware.ts — this is a lightweight client fallback
  if (!isAuthenticated || !isStaffRole(user?.role ?? "")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Filter nav items based on user's permissions
  const userPerms = user?.permissions ? JSON.stringify(user.permissions) : undefined;
  const userRole = (user?.role ?? "") as RoleValue;
  const visibleNavItems = navItems.filter((item) => {
    // Dashboard always visible to staff
    if (item.href === "/admin") return true;
    return hasPermission(userRole, Permission.VIEW_ORDERS, userPerms) ||
           hasPermission(userRole, Permission.VIEW_PRODUCTS, userPerms) ||
           hasPermission(userRole, Permission.VIEW_CUSTOMERS, userPerms) ||
           hasPermission(userRole, Permission.VIEW_ANALYTICS, userPerms) ||
           hasPermission(userRole, Permission.MANAGE_DISCOUNTS, userPerms) ||
           hasPermission(userRole, Permission.MANAGE_RETURNS, userPerms) ||
           hasPermission(userRole, Permission.VIEW_AUDIT_LOGS, userPerms) ||
           hasPermission(userRole, Permission.MANAGE_NEWSLETTER, userPerms) ||
           hasPermission(userRole, Permission.MANAGE_SETTINGS, userPerms); // FIXED: L2 — removed || true fallback
  });

  return (
    <div className="min-h-screen bg-background" style={{ "--radius": "1rem" } as React.CSSProperties}>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 bg-background border-r border-border transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {sidebarOpen && (
            <Link href="/admin" className="flex items-center gap-3 group">
              <div className="relative h-10 w-10 shrink-0 bg-white rounded-full p-0.5 shadow-sm border border-border group-hover:scale-110 transition-transform">
                <Image
                  src="/logo.jpg"
                  alt="Emaan Thread"
                  fill
                  className="object-contain rounded-full"
                />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold tracking-wider uppercase truncate">
                  Emaan Thread
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">
                  Admin Panel
                </span>
              </div>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn(!sidebarOpen && "mx-auto")}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 h-[calc(100vh-4rem)]">
          <nav className="p-3 space-y-1">
            {visibleNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-sm font-medium">
                        {item.label}
                      </span>
                      {item.badge && (
                        <Badge
                          variant={isActive ? "secondary" : "outline"}
                          className="h-5 px-1.5 text-[10px]"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <div
        className={cn(
          "transition-all duration-300",
          sidebarOpen ? "ml-64" : "ml-20"
        )}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur border-b border-border flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold capitalize">
              {pathname === "/admin"
                ? "Dashboard"
                : pathname.split("/").pop()?.replace("-", " ")}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 h-9"
                placeholder="Search products, orders, customers..."
              />
            </div>
            {/* Visit Store */}
            <Button variant="outline" size="sm" asChild>
              <Link href="/" target="_blank">
                Visit Store
              </Link>
            </Button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Alert Bell */}
            <DropdownMenu onOpenChange={(open) => {
              if (open) {
                setAlertCounts((prev) => ({ ...prev, total: 0 }));
              } else {
                fetchAlerts();
              }
            }}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {alertCounts.total > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-medium">
                      {alertCounts.total}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Admin Alerts</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/admin/orders" className="flex items-center justify-between">
                    <span>🛒 New orders (last 1h)</span>
                    {alertCounts.newOrders > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        {alertCounts.newOrders}
                      </Badge>
                    )}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/admin/returns" className="flex items-center justify-between">
                    <span>↩️ Pending returns</span>
                    {alertCounts.pendingReturns > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        {alertCounts.pendingReturns}
                      </Badge>
                    )}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/admin/products?filter=low-stock" className="flex items-center justify-between">
                    <span>📦 Low stock products</span>
                    {alertCounts.lowStockProducts > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        {alertCounts.lowStockProducts}
                      </Badge>
                    )}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/admin/orders?status=pending" className="flex items-center justify-between">
                    <span>⏰ Backlog orders ({">"}24h)</span>
                    {alertCounts.backlogOrders > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        {alertCounts.backlogOrders}
                      </Badge>
                    )}
                  </Link>
                </DropdownMenuItem>
                {alertCounts.total === 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-center w-full justify-center text-sm text-muted-foreground">
                      All caught up — no alerts
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {user?.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {sidebarOpen && (
                    <span className="text-sm font-medium">{user?.name}</span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user?.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
