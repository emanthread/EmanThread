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
 * Return the safe SMS provider for the current environment.
 * SendPK requires IP whitelisting — it is fundamentally incompatible with
 * Vercel serverless (dynamic outbound IP pool). On Vercel we force the
 * API-key-based Pakistan SMS provider instead.
 */
function getSMSProviderName(): "pakistan_local" | "sendpk" {
  const configured = process.env.NOTIFICATION_SMS_PROVIDER;
  if (configured === "sendpk" || configured === "pakistan_local") {
    return configured;
  }
  // Auto-detect: Vercel → force pakistan_local (API-key based, serverless-safe)
  // Local dev → allow sendpk (IP whitelist works on fixed dev IP)
  if (process.env.VERCEL === "1") {
    return "pakistan_local";
  }
  return "sendpk";
}

/**
 * Hard runtime guard: block SendPK on Vercel with a clear error.
 * Must be called once at startup in every serverless function that uses SMS.
 */
export function assertSMSServerlessSafe(): void {
  if (process.env.VERCEL === "1" && smsConfig.provider === "sendpk") {
    throw new Error(
      "[FATAL] SendPK provider is incompatible with Vercel serverless (IP whitelist requirement). " +
      "Set NOTIFICATION_SMS_PROVIDER=pakistan_local and configure PAKISTAN_SMS_* env vars."
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
  // SMS disabled in sandbox; enable in production via NOTIFICATION_SMS_ENABLED=true
  smsEnabled: process.env.NOTIFICATION_SMS_ENABLED === "true",
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