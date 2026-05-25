// ── Notification types ───────────────────────────────────────────

export type NotificationChannel = "email" | "sms" | "whatsapp";

export type NotificationTemplate =
  | "order_confirmation"
  | "order_processing"
  | "payment_success"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled"
  | "return_request_submitted"
  | "return_request_approved"
  | "return_request_rejected"
  | "return_request_completed"
  | "low_stock_alert";

export interface NotificationPayload {
  to: string;
  phone?: string;
  template: NotificationTemplate;
  data: Record<string, string>;
  orderId?: string;
  channels?: NotificationChannel[]; // Optional: override default channels
}

export interface SendResult {
  success: boolean;
  providerRef?: string;
  error?: string;
}

export type SMSProviderName = "pakistan_local" | "sendpk";

export interface SMSConfig {
  provider: SMSProviderName;
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
  endpoint?: string;
  apiKey?: string;
  sender?: string;
}