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

      // Normalise phone number (same logic as SendPK provider)
      let recipientPhone = (payload.phone || payload.to).replace(/\D/g, "");
      if (recipientPhone.startsWith("0")) {
        recipientPhone = "92" + recipientPhone.slice(1);
      } else if (!recipientPhone.startsWith("92")) {
        recipientPhone = "92" + recipientPhone;
      }

      if (recipientPhone.length < 10) {
        return {
          success: false,
          error: `Invalid phone number: ${payload.phone || payload.to}`,
        };
      }

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