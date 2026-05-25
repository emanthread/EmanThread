// ── SendPK SMS provider (Pakistan) ──────────────────────────────

import { NotificationProvider } from "./base";
import { smsConfig } from "../config";
import { SMSTemplates } from "../templates";
import type { NotificationPayload, SendResult } from "../types";

/**
 * Retriable SendPK errors: network/timeout issues, rate-limiting.
 * Non-retriable: invalid credentials, insufficient credit, rejected, unknown number.
 */
const NON_RETRIABLE_CODES = new Set(["1", "2", "3", "4", "5", "6", "7", "8"]);

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class SendPKProvider extends NotificationProvider {
  readonly channel = "sms";

  async send(payload: NotificationPayload): Promise<SendResult> {
    try {
      const template = SMSTemplates[payload.template];
      if (!template) {
        return { success: false, error: `Unknown template: ${payload.template}` };
      }

      const body = template(payload.data);
      const { username, password, sender } = smsConfig.sendpk;

      if (!username || !password) {
        return { success: false, error: "SendPK credentials not configured" };
      }

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

      const params = new URLSearchParams({
        username,
        password,
        sender: sender || "EmanThread",
        mobile: recipientPhone,
        message: body,
      });

      // Retry loop with exponential backoff (1s, 2s, 4s)
      const MAX_RETRIES = 3;
      let lastError: string | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await fetch(
            `https://sendpk.com/api/sms.php?${params.toString()}`,
            { signal: AbortSignal.timeout(15000) }
          );

          const text = (await response.text()).trim();

          if (text.startsWith("OK")) {
            const id = text.includes(":") ? text.split(":")[1]?.trim() : text;
            return { success: true, providerRef: id || text };
          }

          const errorMap: Record<string, string> = {
            "1": "Invalid credentials",
            "2": "Username is empty",
            "3": "Password is empty",
            "4": "Sender is empty",
            "5": "Recipient is empty",
            "6": "Message is empty",
            "7": "Invalid recipient",
            "8": "Insufficient credit",
            "9": "SMS rejected",
          };

          // Non-retriable error — return immediately
          if (NON_RETRIABLE_CODES.has(text)) {
            return {
              success: false,
              error: errorMap[text] || `SendPK error: ${text}`,
            };
          }

          // Retriable error — save and retry
          lastError = errorMap[text] || `SendPK error: ${text}`;
          if (attempt < MAX_RETRIES) {
            await delay(1000 * Math.pow(2, attempt - 1));
          }
        } catch (err) {
          // Network-level error — retriable
          lastError = err instanceof Error ? err.message : "SendPK send failed";
          if (attempt < MAX_RETRIES) {
            await delay(1000 * Math.pow(2, attempt - 1));
          }
        }
      }

      return {
        success: false,
        error: lastError || "SendPK max retries exceeded",
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "SendPK send failed",
      };
    }
  }
}