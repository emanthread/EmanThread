// ── Pakistan-local SMS gateway provider ──────────────────────────

import { NotificationProvider } from "./base";
import { smsConfig } from "../config";
import { SMSTemplates } from "../templates";
import type { NotificationPayload, SendResult } from "../types";

export class PakistanSMSProvider extends NotificationProvider {
  readonly channel = "sms";

  async send(payload: NotificationPayload): Promise<SendResult> {
    try {
      const template = SMSTemplates[payload.template];
      if (!template) {
        return { success: false, error: `Unknown template: ${payload.template}` };
      }

      const body = template(payload.data);
      const { endpoint, apiKey, sender } = smsConfig.pakistan;

      if (!endpoint || !apiKey) {
        return { success: false, error: "Pakistan SMS gateway not configured" };
      }

      // Generic REST POST — adapt payload shape per your gateway
      // Use payload.phone first (the actual phone number); fall back to
      // payload.to only when phone is absent (e.g. explicit channels override).
      const recipientPhone = (payload.phone || payload.to).trim();

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          to: recipientPhone,
          from: sender || "EmanThreads",
          message: body,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: result.message || `SMS gateway error: ${response.status}`,
        };
      }

      return { success: true, providerRef: result.id || result.reference };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Pakistan SMS send failed",
      };
    }
  }
}