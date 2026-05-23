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

export const smsConfig = {
  provider: (process.env.NOTIFICATION_SMS_PROVIDER || "sendpk") as
    | "pakistan_local"
    | "sendpk",
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
  enabledChannels: ["email", "whatsapp"] as const,
  // SMS disabled by default in sandbox; enable in production
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