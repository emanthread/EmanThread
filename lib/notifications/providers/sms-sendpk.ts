// ── SendPK SMS provider (Pakistan) ──────────────────────────────

import { NotificationProvider } from "./base";
import { smsConfig } from "../config";
import { SMSTemplates } from "../templates";
import type { NotificationPayload, SendResult } from "../types";

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

      const response = await fetch(
        `https://sendpk.com/api/sms.php?${params.toString()}`
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

      return {
        success: false,
        error: errorMap[text] || `SendPK error: ${text}`,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "SendPK send failed",
      };
    }
  }
}
