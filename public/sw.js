/*
 * Retire the old PWA worker. This URL must remain available because browsers
 * with an installed worker check the same script URL for updates.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    await self.registration.unregister();

    // Refresh shopping pages once so a tab already showing cached markup gets
    // the live page. Preserve checkout and account forms in other tabs.
    const tabs = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    const storefrontRoots = [
      "/",
      "/women",
      "/men",
      "/teens",
      "/fragrance-beauty",
      "/shop",
      "/product",
    ];
    await Promise.all(tabs.map((tab) => {
      const url = new URL(tab.url);
      const isStorefront = storefrontRoots.some((root) =>
        root === "/" ? url.pathname === "/" :
        url.pathname === root || url.pathname.startsWith(root + "/")
      );
      if (isStorefront) return tab.navigate(url.href);
      return undefined;
    }));
  })());
});
