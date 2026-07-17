"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";

export function AuthSync() {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminLogin = pathname === "/admin/login";

  useEffect(() => {
    if (isAdminLogin) return;

    const controller = new AbortController();
    const endpoint = isAdminRoute ? "/api/auth/session" : "/api/user/profile";
    fetch(endpoint, { signal: controller.signal })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not authenticated");
      })
      .then((data) => {
        const profile = isAdminRoute ? data.user : data;
        if (!profile?.id || !profile?.role) throw new Error("Not authenticated");

        useAuthStore.setState({
          user: {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            whatsappConsent: profile.whatsappConsent,
            whatsappPhone: profile.whatsappPhone,
            role: profile.role,
            permissions: profile.permissions,
            isVerified: profile.isVerified ?? true,
            addresses: profile.addresses || [],
            createdAt: profile.createdAt || "",
          },
          isAuthenticated: true,
        });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (
          isAdminRoute &&
          (!(error instanceof Error) || error.message !== "Not authenticated")
        ) {
          return;
        }
        useAuthStore.setState({ user: null, isAuthenticated: false });
        if (isAdminRoute) window.location.assign("/admin/login");
      });

    return () => controller.abort();
  }, [isAdminLogin, isAdminRoute]);

  return null;
}
