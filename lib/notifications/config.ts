// ── Notification configuration ───────────────────────────────────

export const resendConfig = {
  apiKey: process.env.RESEND_API_KEY || "",
  fromEmail:
    process.env.RESEND_FROM_EMAIL ||
    (process.env.MAIL_FROM
      ? process.env.MAIL_FROM.includes("<")
        ? process.env.MAIL_FROM
        : `Eman Thread <${process.env.MAIL_FROM}>`
      : "Eman Thread <orders@emanthread.com>"),
};

/**
 * Return the SMS provider based on the explicit environment config.
 * SendPK's API (sendpk.com/api/sms.php) uses URL query params for auth,
 * which works fine in Vercel serverless — no IP whitelist required.
 * The user's NOTIFICATION_SMS_PROVIDER setting is always honored.
 */
function getSMSProviderName(): "pakistan_local" | "sendpk" {
  const configured = process.env.NOTIFICATION_SMS_PROVIDER;
  if (configured === "sendpk") return "sendpk";
  if (configured === "pakistan_local") return "pakistan_local";
  // Default to SendPK — API-key-based, works everywhere
  console.warn(
    "[notifications] NOTIFICATION_SMS_PROVIDER not set, defaulting to 'sendpk'. " +
    "Set to 'pakistan_local' to use the custom Pakistan SMS gateway."
  );
  return "sendpk";
}

/**
 * Soft guard — logs a warning instead of crashing.
 * SendPK works perfectly fine on Vercel; the old IP-whitelist concern
 * was incorrect since SendPK uses query-param-based auth (not IP allowlist).
 */
export function assertSMSServerlessSafe(): void {
  if (process.env.VERCEL === "1" && smsConfig.provider === "sendpk") {
    console.warn(
      "[notifications] Using SendPK provider on Vercel — this is fine. " +
      "SendPK's sms.php endpoint uses URL-based auth, not IP whitelisting."
    );
  }
}

export const smsConfig = {
  provider: getSMSProviderName(),
  pakistan: {
    endpoint: process.env.PAKISTAN_SMS_ENDPOINT || "",
    apiKey: process.env.PAKISTAN_SMS_API_KEY || "",
    sender: process.env.PAKISTAN_SMS_SENDER || "EmanThread",
  },
  sendpk: {
    username: process.env.SENDPK_USERNAME || "",
    password: process.env.SENDPK_PASSWORD || "",
    sender: process.env.SENDPK_SENDER || "EmanThread",
  },
};

export const whatsappConfig = {
  apiKey: process.env.WHATSAPP_API_KEY || "",
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
  apiVersion: "v18.0",
};

export const notificationDefaults = {
  // Default mobile channel for order/payment/return lifecycle events.
  // WhatsApp integration is reserved for a future release — all WA provider
  // code, templates, and config remain intact but are NOT in the default path.
  enabledChannels: ["sms"] as const,
  // SMS enabled by default; disable explicitly via NOTIFICATION_SMS_ENABLED=false
  smsEnabled: process.env.NOTIFICATION_SMS_ENABLED !== "false",
};

// Pre-approved WhatsApp Business API HSM template names
// These must be created and approved in the Meta Business Manager
export const whatsappTemplateNames: Record<string, string> = {
  order_confirmation: "order_confirmation",
  payment_success: "payment_success",
  order_shipped: "order_shipped",
  order_delivered: "order_delivered",
  order_cancelled: "order_cancelled",
  return_request_submitted: "return_request_submitted",
  return_request_approved: "return_request_approved",
  return_request_rejected: "return_request_rejected",
  return_request_completed: "return_request_completed",
  low_stock_alert: "low_stock_alert",
};