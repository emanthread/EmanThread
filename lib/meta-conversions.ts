import "server-only";

import { createHash } from "crypto";
import { getStoreConfig } from "@/lib/db/store-config";

export interface MetaServerEvent {
  eventName: "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";
  eventId: string;
  eventSourceUrl: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbp?: string;
  fbc?: string;
  email?: string;
  phone?: string;
  customData?: {
    currency?: string;
    value?: number;
    content_ids?: string[];
    content_type?: string;
  };
}

function sha256(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "92" + digits.slice(1);
  return digits;
}

export async function sendMetaServerEvent(event: MetaServerEvent) {
  const accessToken = process.env.META_CONVERSIONS_API_TOKEN;
  const graphVersion = process.env.META_GRAPH_API_VERSION;
  const testEventCode = process.env.META_TEST_EVENT_CODE;
  const { facebookPixelId } = await getStoreConfig();

  if (!facebookPixelId || !accessToken || !graphVersion) {
    return { sent: false as const, reason: "not-configured" as const };
  }

  const userData: Record<string, string | string[]> = {};
  if (event.clientIpAddress) userData.client_ip_address = event.clientIpAddress;
  if (event.clientUserAgent) userData.client_user_agent = event.clientUserAgent;
  if (event.fbp) userData.fbp = event.fbp;
  if (event.fbc) userData.fbc = event.fbc;
  if (event.email) userData.em = [sha256(event.email)];
  if (event.phone) userData.ph = [sha256(normalizePhone(event.phone))];

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: event.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: event.eventId,
        event_source_url: event.eventSourceUrl,
        action_source: "website",
        user_data: userData,
        ...(event.customData ? { custom_data: event.customData } : {}),
      },
    ],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };

  const response = await fetch(
    "https://graph.facebook.com/" +
      graphVersion +
      "/" +
      encodeURIComponent(facebookPixelId) +
      "/events?access_token=" +
      encodeURIComponent(accessToken),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error("[meta-capi] Event rejected", response.status, body.slice(0, 500));
    return { sent: false as const, reason: "provider-error" as const };
  }

  return { sent: true as const };
}
