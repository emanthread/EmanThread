"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Package, 
  Heart, 
  MapPin, 
  Settings, 
  ChevronRight,
  LogOut,
  ShoppingBag,
  Ruler,
  AlertTriangle,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { useAuthStore } from "@/lib/auth-store";

interface OrderStats {
  total: number;
  pending: number;
  delivered: number;
}

const menuItems = [
  {
    icon: Package,
    label: "My Orders",
    description: "View your order history",
    href: "/account/orders",
  },
  {
    icon: Heart,
    label: "Wishlist",
    description: "Products you have saved",
    href: "/account/wishlist",
  },
  {
    icon: MapPin,
    label: "Addresses",
    description: "Manage delivery addresses",
    href: "/account/addresses",
  },
  {
    icon: Ruler,
    label: "Stitching Services",
    description: "Saved measurement profiles",
    href: "/account/measurements",
  },
  {
    icon: MessageSquare,
    label: "My Reviews",
    description: "Your product reviews and ratings",
    href: "/account/reviews",
  },
  {
    icon: Settings,
    label: "Settings",
    description: "Account preferences",
    href: "/account/settings",
  },
];

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Server-side auth is handled by middleware.ts — this is a lightweight client fallback
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push("/login");
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !user) {
    return null;
  }

  useEffect(() => {
    const fetchOrderStats = async () => {
      try {
        const res = await fetch("/api/user/order-stats");
        if (res.ok) {
          const data = await res.json();
          setOrderStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch order stats:", err);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchOrderStats();
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <Header />
      <CartDrawer />

      <main className="min-h-screen bg-muted/30 pt-28 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Email Verification Banner */}
          {!user.isVerified && (
            <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Email Not Verified
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Please check your inbox for the verification email. 
                  If you didn't receive it, check your spam folder or contact support.
                </p>
              </div>
            </div>
          )}

          {/* Profile Header */}
          <Card className="mb-6 overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-primary/20 to-accent/20" />
            <CardContent className="relative pt-0">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 sm:-mt-8">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarFallback className="text-2xl font-serif bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-center sm:text-left pb-2">
                  <h1 className="text-2xl font-serif">{user.name}</h1>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
                <Button variant="outline" asChild className="shrink-0">
                  <Link href="/account/settings">
                    Edit Profile
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Order Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <ShoppingBag className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-semibold">
                  {statsLoading ? (
                    <span className="inline-block h-6 w-8 bg-muted rounded animate-pulse" />
                  ) : (
                    orderStats?.total ?? 0
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Total Orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Package className="h-6 w-6 mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-semibold">
                  {statsLoading ? (
                    <span className="inline-block h-6 w-8 bg-muted rounded animate-pulse" />
                  ) : (
                    orderStats?.pending ?? 0
                  )}
                </p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Package className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
                <p className="text-2xl font-semibold">
                  {statsLoading ? (
                    <span className="inline-block h-6 w-8 bg-muted rounded animate-pulse" />
                  ) : (
                    orderStats?.delivered ?? 0
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Delivered</p>
              </CardContent>
            </Card>
          </div>

          {/* Menu Items */}
          <Card>
            <CardContent className="p-0">
              {menuItems.map((item, index) => (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                  {index < menuItems.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Logout Button */}
          <Button
            variant="outline"
            className="w-full mt-6 h-12 text-red-600 hover:text-red-600 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </div>
      </main>

      <Footer />
    </>
  );
}