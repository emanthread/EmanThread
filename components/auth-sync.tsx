"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useCartStore } from "@/lib/cart-store";
import {
  getGuestWishlistIdentity,
  getUserWishlistIdentity,
  useWishlistStore,
} from "@/lib/wishlist-store";

export function AuthSync() {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminLogin = pathname === "/admin/login";

  useEffect(() => {
    // Login/logout flows update the auth store directly, without necessarily
    // changing the route flags below. Keep the wishlist scope in sync for those
    // flows as well as the initial server-session check.
    return useAuthStore.subscribe((state, previousState) => {
      const currentUserId = state.isAuthenticated ? state.user?.id ?? null : null;
      const previousUserId = previousState.isAuthenticated
        ? previousState.user?.id ?? null
        : null;

      // A session can expire before the initial profile request has populated
      // the user object. Resolve that unauthenticated state even when both
      // previous/current IDs are null.
      if (!state.isAuthenticated && previousState.isAuthenticated) {
        useCartStore.getState().setStitchingIdentity(null);
      }

      if (currentUserId === previousUserId) return;

      // Cart lines stay available, while profile and measurement choices are
      // released only to this verified signed-in identity.
      useCartStore.getState().setStitchingIdentity(currentUserId);

      if (currentUserId) {
        useWishlistStore
          .getState()
          .setWishlistIdentity(getUserWishlistIdentity(currentUserId));
        return;
      }

      // Do not leave the previous customer's active mirror on screen during
      // logout. A guest gets a fresh session-scoped wishlist instead.
      useWishlistStore.getState().beginIdentityResolution();
      useWishlistStore
        .getState()
        .setWishlistIdentity(getGuestWishlistIdentity());
    });
  }, []);

  useEffect(() => {
    // The persisted wishlist is deliberately never shown until this check has
    // selected the correct user (or the current browser-session guest).
    useWishlistStore.getState().beginIdentityResolution();

    if (isAdminLogin) return;

    const controller = new AbortController();
    const syncAuth = async () => {
      try {
        const sessionResponse = await fetch("/api/auth/session", {
          signal: controller.signal,
        });
        if (!sessionResponse.ok) throw new Error("Not authenticated");

        const session = await sessionResponse.json();
        if (!session?.user?.id || !session.user.role) {
          throw new Error("Not authenticated");
        }

        let profile = session.user;
        if (!isAdminRoute) {
          const profileResponse = await fetch("/api/user/profile", {
            signal: controller.signal,
          });
          if (!profileResponse.ok) throw new Error("Not authenticated");
          profile = await profileResponse.json();
        }

        if (!profile?.id || !profile?.role) throw new Error("Not authenticated");

        useAuthStore.setState({
          user: {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            whatsappConsent: profile.whatsappConsent,
            whatsappPhone: profile.whatsappPhone,
            whatsappMarketingConsent: profile.whatsappMarketingConsent,
            phoneMarketingConsent: profile.phoneMarketingConsent,
            role: profile.role,
            permissions: profile.permissions,
            isVerified: profile.isVerified ?? true,
            addresses: profile.addresses || [],
            createdAt: profile.createdAt || "",
          },
          isAuthenticated: true,
        });
        // The subscription above normally performs this release. Calling it
        // here also covers an already-set auth state during route transitions.
        useCartStore.getState().setStitchingIdentity(profile.id);
        useWishlistStore
          .getState()
          .setWishlistIdentity(getUserWishlistIdentity(profile.id));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (
          isAdminRoute &&
          (!(error instanceof Error) || error.message !== "Not authenticated")
        ) {
          return;
        }
        useAuthStore.setState({ user: null, isAuthenticated: false });
        useCartStore.getState().setStitchingIdentity(null);
        useWishlistStore
          .getState()
          .setWishlistIdentity(getGuestWishlistIdentity());
        if (isAdminRoute) window.location.assign("/admin/login");
      }
    };

    void syncAuth();

    return () => controller.abort();
  }, [isAdminLogin, isAdminRoute]);

  return null;
}
