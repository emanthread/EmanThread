"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  readTrackingConsent,
  TRACKING_CONSENT_EVENT,
  type TrackingConsent,
} from "@/lib/tracking-consent";

interface StorefrontTrackingProps {
  googleAnalyticsId?: string;
  facebookPixelId?: string;
}

type PixelFunction = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
  push?: (...args: unknown[]) => void;
};

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
    fbq?: PixelFunction;
    _fbq?: PixelFunction;
  }
}

function eventId() {
  return globalThis.crypto?.randomUUID?.() ??
    "evt-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

function initializeGoogleAnalytics(id: string) {
  if (!document.getElementById("google-analytics-script")) {
    const script = document.createElement("script");
    script.id = "google-analytics-script";
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    document.head.appendChild(script);
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  window.gtag("js", new Date());
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
  });
}

function initializeMetaPixel(id: string) {
  if (!window.fbq) {
    const pixel: PixelFunction = (...args: unknown[]) => {
      if (pixel.callMethod) pixel.callMethod(...args);
      else pixel.queue?.push(args);
    };
    pixel.queue = [];
    pixel.loaded = true;
    pixel.version = "2.0";
    pixel.push = pixel;
    window.fbq = pixel;
    window._fbq = pixel;
  }

  if (!document.getElementById("facebook-pixel-script")) {
    const script = document.createElement("script");
    script.id = "facebook-pixel-script";
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  if (document.documentElement.dataset.metaPixelInitialized !== id) {
    window.fbq?.("init", id);
    window.fbq?.("consent", "grant");
    document.documentElement.dataset.metaPixelInitialized = id;
  }
}

export function StorefrontTracking({
  googleAnalyticsId,
  facebookPixelId,
}: StorefrontTrackingProps) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<TrackingConsent | null>(null);
  const lastGooglePath = useRef("");
  const lastMetaPath = useRef("");

  useEffect(() => {
    setConsent(readTrackingConsent());
    const handleConsent = (event: Event) => {
      const value = (event as CustomEvent<TrackingConsent>).detail;
      setConsent(value);
      if (value === "denied") {
        window.gtag?.("consent", "update", {
          analytics_storage: "denied",
          ad_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied",
        });
        window.fbq?.("consent", "revoke");
      }
    };
    window.addEventListener(TRACKING_CONSENT_EVENT, handleConsent);
    return () => window.removeEventListener(TRACKING_CONSENT_EVENT, handleConsent);
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/admin") || consent !== "granted") return;

    if (googleAnalyticsId) {
      initializeGoogleAnalytics(googleAnalyticsId);
      if (lastGooglePath.current !== pathname) {
        window.gtag?.("config", googleAnalyticsId, {
          page_path: pathname,
          anonymize_ip: true,
        });
        lastGooglePath.current = pathname;
      }
    }

    if (facebookPixelId) {
      initializeMetaPixel(facebookPixelId);
      if (lastMetaPath.current !== pathname) {
        const id = eventId();
        window.fbq?.("track", "PageView", {}, { eventID: id });
        void fetch("/api/meta/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analyticsConsent: true,
            eventName: "PageView",
            eventId: id,
            eventSourceUrl: window.location.href,
          }),
          keepalive: true,
        }).catch(() => undefined);
        lastMetaPath.current = pathname;
      }
    }
  }, [consent, facebookPixelId, googleAnalyticsId, pathname]);

  return null;
}
