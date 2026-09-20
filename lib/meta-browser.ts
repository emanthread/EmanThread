import { readTrackingConsent } from "@/lib/tracking-consent";

export type MetaEventName =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase";

export interface MetaEventData {
  currency?: string;
  value?: number;
  content_ids?: string[];
  content_type?: string;
}

function createEventId() {
  return globalThis.crypto?.randomUUID?.() ??
    "evt-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

export function trackMetaEvent(eventName: MetaEventName, customData?: MetaEventData) {
  if (typeof window === "undefined" || readTrackingConsent() !== "granted") {
    return null;
  }

  const id = createEventId();
  const pixel = window as Window & {
    fbq?: (...args: unknown[]) => void;
  };
  pixel.fbq?.("track", eventName, customData ?? {}, { eventID: id });

  void fetch("/api/meta/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      analyticsConsent: true,
      eventName,
      eventId: id,
      eventSourceUrl: window.location.href,
      ...(customData ? { customData } : {}),
    }),
    keepalive: true,
  }).catch(() => undefined);

  return id;
}
