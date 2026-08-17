import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: any;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  self.clients.claim();
});

// Precache all static assets
self.__SW_MANIFEST = self.__SW_MANIFEST || [];

// Apply default cache strategies for navigation, assets, etc.
import { NetworkOnly, Serwist } from "serwist";

function isNeverCachedApi(pathname: string): boolean {
  return (
    pathname === "/api/admin/reviews" ||
    pathname.startsWith("/api/admin/reviews/") ||
    pathname === "/api/user/reviews" ||
    pathname.startsWith("/api/user/reviews/") ||
    /^\/api\/products\/[^/]+\/reviews$/.test(pathname) ||
    pathname === "/api/admin/customer-measurements" ||
    pathname.startsWith("/api/admin/customer-measurements/") ||
    pathname === "/api/admin/measurements" ||
    pathname.startsWith("/api/admin/measurements/")
  );
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Review and measurement-management data must never fall back to a stale
  // cached API response. This rule precedes Serwist's broad /api rule.
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url: { pathname } }) =>
        sameOrigin && isNeverCachedApi(pathname),
      method: "GET",
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
