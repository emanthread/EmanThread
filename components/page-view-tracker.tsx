"use client";

import { useEffect } from "react";

export function PageViewTracker() {
  useEffect(() => {
    // Only run on the client
    if (typeof window === "undefined") return;

    // Debounce: only track once per page load (not on every route change)
    const url = window.location.pathname + window.location.search;
    const referrer = document.referrer || "Direct";

    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");
    const utmMedium = params.get("utm_medium");
    const utmCampaign = params.get("utm_campaign");

    // Fire and forget — no need to await
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        referrer,
        utmSource,
        utmMedium,
        utmCampaign,
      }),
    }).catch(() => {
      // Silently fail
    });
  }, []);

  return null;
}