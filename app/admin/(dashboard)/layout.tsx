"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
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
  X,
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
  MoreHorizontal,
  Layers,
  CalendarDays,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/lib/auth-store";
import { useAlertDismissals } from "@/hooks/use-alert-dismissals";
import { useAdminStore } from "@/lib/admin-store";
import type { AlertCounts } from "@/lib/admin-store";
import { useAdminPushNotifications } from "@/hooks/use-admin-push-notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { isStaffRole, hasPermission, Permission, type RoleValue } from "@/lib/permissions";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/orders", icon: ShoppingCart, label: "Orders" },
  { href: "/admin/products", icon: Package, label: "Products" },
  { href: "/admin/customers", icon: Users, label: "Customers" },
  { href: "/admin/discounts", icon: Tag, label: "Discounts" },
  { href: "/admin/returns", icon: BarChart3, label: "Returns" },
  { href: "/admin/payment-verification", icon: CreditCard, label: "Payments" },
  { href: "/admin/measurements", icon: Ruler, label: "Stitching" },
  { href: "/admin/stitching-calendar", icon: CalendarDays, label: "Delivery Calendar" },
  { href: "/admin/audit-logs", icon: ClipboardList, label: "Audit Logs" },
  { href: "/admin/newsletter", icon: Mail, label: "Newsletter" },
  { href: "/admin/media-library", icon: ImageIcon, label: "Media Library" },
  { href: "/admin/monitoring", icon: Activity, label: "Monitoring" },
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/admin/shipping", icon: Truck, label: "Shipping" },
  { href: "/admin/hero-slides", icon: ImageIcon, label: "Hero Slider" },
  { href: "/admin/featured-categories", icon: ImageIcon, label: "Featured Categories" },
  { href: "/admin/fabric-types", icon: Layers, label: "Fabric Types" },
  { href: "/admin/reviews", icon: MessageSquare, label: "Reviews" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

// Primary bottom nav items (most-used 5 + More)
const bottomNavItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/orders", icon: ShoppingCart, label: "Orders" },
  { href: "/admin/products", icon: Package, label: "Products" },
  { href: "/admin/customers", icon: Users, label: "Customers" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

// Shared nav link renderer
const NavLink = ({
  item,
  collapsed = false,
  pathname,
  onClick,
}: {
  item: (typeof navItems)[0];
  collapsed?: boolean;
  pathname: string;
  onClick?: () => void;
}) => {
  const isActive =
    pathname === item.href ||
    (item.href !== "/admin" && pathname.startsWith(item.href));

  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group min-h-[44px]",
        collapsed ? "justify-center" : "",
        isActive
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-muted-foreground hover:text-foreground"
      )}
    >
      <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      {!collapsed && (
        <span className="flex-1 text-sm font-medium">{item.label}</span>
      )}
      {collapsed && (
        <span className="sr-only">{item.label}</span>
      )}
    </Link>
  );
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, toggleSidebar, alertCounts, loadAlerts } = useAdminStore();

  // Mobile drawer state — separate from desktop sidebar state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // displayAlerts is UI-only: applies dismissal filtering on top of the raw alertCounts from store.
  const [displayAlerts, setDisplayAlerts] = useState({
    newOrders: 0,
    pendingReturns: 0,
    lowStockProducts: 0,
    backlogOrders: 0,
    total: 0,
  });

  const { getDismissedAt, dismissAlert } = useAlertDismissals();

  const updateDisplayAlerts = useCallback((counts: AlertCounts) => {
    const lastNewOrders = getDismissedAt("clear_newOrders");
    const lastPendingReturns = getDismissedAt("clear_pendingReturns");
    const lastLowStock = getDismissedAt("clear_lowStock");
    const lastBacklog = getDismissedAt("clear_backlogOrders");

    const dNewOrders = (lastNewOrders && counts.newOrdersLatest && counts.newOrdersLatest <= lastNewOrders) ? 0 : counts.newOrders;
    const dPendingReturns = (lastPendingReturns && counts.pendingReturnsLatest && counts.pendingReturnsLatest <= lastPendingReturns) ? 0 : counts.pendingReturns;
    const dLowStock = (lastLowStock && counts.lowStockLatest && counts.lowStockLatest <= lastLowStock) ? 0 : counts.lowStockProducts;
    const dBacklog = (lastBacklog && counts.backlogOrdersLatest && counts.backlogOrdersLatest <= lastBacklog) ? 0 : counts.backlogOrders;

    setDisplayAlerts({
      newOrders: dNewOrders,
      pendingReturns: dPendingReturns,
      lowStockProducts: dLowStock,
      backlogOrders: dBacklog,
      total: dNewOrders + dPendingReturns + dLowStock + dBacklog
    });
  }, [getDismissedAt]);

  const fetchAlerts = useCallback(async () => {
    // Don't poll when tab is hidden — saves mobile battery/data
    if (document.visibilityState === "hidden") return;
    await loadAlerts();
    // Read the freshest alertCounts from the store to recompute display badges.
    // useAdminStore.getState() gives us the post-mutation snapshot.
    updateDisplayAlerts(useAdminStore.getState().alertCounts);
  }, [loadAlerts, updateDisplayAlerts]);

  const clearAlert = (storageKey: string, latestAt: string | null) => {
    if (latestAt) {
      dismissAlert(storageKey, latestAt);
      updateDisplayAlerts(alertCounts);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);

    // Pause polling when tab becomes hidden, resume when visible
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchAlerts();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchAlerts]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  // Mount browser push notification hook
  useAdminPushNotifications();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

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

  const userPerms = user?.permissions ? JSON.stringify(user.permissions) : undefined;
  const userRole = (user?.role ?? "") as RoleValue;
  const visibleNavItems = navItems.filter((item) => {
    if (item.href === "/admin") return true;
    return (
      hasPermission(userRole, Permission.VIEW_ORDERS, userPerms) ||
      hasPermission(userRole, Permission.VIEW_PRODUCTS, userPerms) ||
      hasPermission(userRole, Permission.VIEW_CUSTOMERS, userPerms) ||
      hasPermission(userRole, Permission.VIEW_ANALYTICS, userPerms) ||
      hasPermission(userRole, Permission.MANAGE_DISCOUNTS, userPerms) ||
      hasPermission(userRole, Permission.MANAGE_RETURNS, userPerms) ||
      hasPermission(userRole, Permission.VIEW_AUDIT_LOGS, userPerms) ||
      hasPermission(userRole, Permission.MANAGE_NEWSLETTER, userPerms) ||
      hasPermission(userRole, Permission.MANAGE_SETTINGS, userPerms)
    );
  });

  const pageTitle =
    pathname === "/admin"
      ? "Dashboard"
      : (() => {
          const segments = pathname.split("/").filter(Boolean);
          const last = segments[segments.length - 1] || "";
          // If the last segment looks like a Prisma cuid or UUID (long alphanumeric), use parent context
          if (last.length >= 20 && /^[a-z0-9-]+$/i.test(last) && segments.length >= 2) {
            const parent = segments[segments.length - 2] || "";
            const singular = parent.endsWith("s") ? parent.slice(0, -1) : parent;
            return singular.charAt(0).toUpperCase() + singular.slice(1).replace(/-/g, " ") + " Details";
          }
          return last.replace(/-/g, " ");
        })() ?? "Admin";



  return (
    <div
      className="min-h-screen bg-background"
      style={{ "--radius": "1rem" } as React.CSSProperties}
    >
      {/* ── DESKTOP SIDEBAR (hidden on mobile) ── */}
      <aside
        className={cn(
          "hidden md:flex fixed left-0 top-0 bottom-0 z-40 bg-background border-r border-border transition-all duration-300 flex-col",
          sidebarOpen ? "w-64" : "w-20"
        )}
        aria-label="Admin navigation"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0">
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
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overscroll-y-none min-h-0">
          <nav className="p-3 space-y-1" aria-label="Main navigation">
            {visibleNavItems.map((item) => (
              <NavLink key={item.href} item={item} collapsed={!sidebarOpen} pathname={pathname} />
            ))}
          </nav>
        </div>
      </aside>

      {/* ── MOBILE DRAWER (Sheet from shadcn) ── */}
      <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col gap-0 max-h-[100dvh]">
          <SheetHeader className="h-16 flex flex-row items-center gap-3 px-4 border-b border-border shrink-0 space-y-0">
            <div className="relative h-9 w-9 shrink-0 bg-white rounded-full p-0.5 shadow-sm border border-border">
              <Image
                src="/logo.jpg"
                alt="Emaan Thread"
                fill
                className="object-contain rounded-full"
              />
            </div>
            <div className="flex flex-col overflow-hidden flex-1">
              <SheetTitle className="text-sm font-semibold tracking-wider uppercase truncate text-left">
                Emaan Thread
              </SheetTitle>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">
                Admin Panel
              </span>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto overscroll-y-none min-h-0">
            <nav className="p-3 space-y-1" aria-label="Mobile navigation">
              {visibleNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onClick={() => setMobileDrawerOpen(false)}
                />
              ))}
            </nav>
          </div>

          {/* Logout in drawer */}
          <div 
            className="p-3 border-t border-border shrink-0"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <button
              onClick={() => { setMobileDrawerOpen(false); handleLogout(); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors min-h-[44px]"
            >
              <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── MAIN CONTENT ── */}
      <div
        className={cn(
          "transition-all duration-300",
          // Desktop: respect sidebar open/closed
          sidebarOpen ? "md:ml-64" : "md:ml-20",
          // Mobile: no margin, but add bottom padding for bottom nav
          "pb-16 md:pb-0"
        )}
      >
        {/* ── TOP HEADER ── */}
        <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur border-b border-border flex items-center px-3 sm:px-6 gap-3">
          {/* Mobile: hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0"
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileDrawerOpen}
            aria-controls="mobile-nav-drawer"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Page title — center on mobile, left on desktop */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold capitalize truncate">
              {pageTitle}
            </h1>
          </div>

          {/* Desktop search */}
          <div className="hidden md:flex relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              className="pl-9 h-9"
              placeholder="Search products, orders..."
              aria-label="Search admin panel"
            />
          </div>

          {/* Desktop: Visit Store */}
          <Button variant="outline" size="sm" asChild className="hidden md:flex">
            <Link href="/" target="_blank">
              Visit Store
            </Link>
          </Button>

          {/* Theme Toggle — hidden on mobile */}
          <div className="hidden md:flex">
            <ThemeToggle />
          </div>

          {/* Alert Bell */}
          <DropdownMenu
            onOpenChange={(open) => {
              if (!open) fetchAlerts();
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative shrink-0"
                aria-label={`Alerts${displayAlerts.total > 0 ? `, ${displayAlerts.total} unread` : ""}`}
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
                {displayAlerts.total > 0 && (
                  <span
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-medium"
                    aria-hidden="true"
                  >
                    {displayAlerts.total}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Admin Alerts</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/admin/orders" onClick={() => clearAlert("clear_newOrders", alertCounts.newOrdersLatest)} className="flex items-center justify-between">
                  <span>🛒 New orders (last 1h)</span>
                  {displayAlerts.newOrders > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {displayAlerts.newOrders}
                    </Badge>
                  )}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/admin/returns" onClick={() => clearAlert("clear_pendingReturns", alertCounts.pendingReturnsLatest)} className="flex items-center justify-between">
                  <span>↩️ Pending returns</span>
                  {displayAlerts.pendingReturns > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {displayAlerts.pendingReturns}
                    </Badge>
                  )}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/admin/products?filter=low-stock" onClick={() => clearAlert("clear_lowStock", alertCounts.lowStockLatest)} className="flex items-center justify-between">
                  <span>📦 Low stock products</span>
                  {displayAlerts.lowStockProducts > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {displayAlerts.lowStockProducts}
                    </Badge>
                  )}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/admin/orders?status=pending" onClick={() => clearAlert("clear_backlogOrders", alertCounts.backlogOrdersLatest)} className="flex items-center justify-between">
                  <span>⏰ Backlog orders ({">"}24h)</span>
                  {displayAlerts.backlogOrders > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {displayAlerts.backlogOrders}
                    </Badge>
                  )}
                </Link>
              </DropdownMenuItem>
              {displayAlerts.total === 0 && (
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
              <Button
                variant="ghost"
                className="gap-2 px-2 shrink-0"
                aria-label={`User menu for ${user?.name}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {user?.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden md:inline">
                  {user?.name}
                </span>
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
                  <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="p-3 sm:p-6">{children}</main>
      </div>

      {/* ── MOBILE BOTTOM NAVIGATION ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Mobile bottom navigation"
      >
        <div className="flex items-center justify-around h-14">
          {bottomNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-2 rounded-lg transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon
                  className={cn("h-5 w-5", isActive && "fill-primary/10")}
                  aria-hidden="true"
                />
                <span className="text-[10px] font-medium leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}
          {/* More button opens mobile drawer */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="More navigation options"
            className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-2 rounded-lg transition-colors text-muted-foreground"
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
