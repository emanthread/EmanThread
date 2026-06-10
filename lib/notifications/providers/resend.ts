// ── Resend email provider ────────────────────────────────────────

import { Resend } from "resend";
import { NotificationProvider } from "./base";
import { resendConfig } from "../config";
import { EmailTemplates } from "../templates";
import type { NotificationPayload, SendResult } from "../types";

export class ResendProvider extends NotificationProvider {
  readonly channel = "email";
  private client: Resend | null;

  constructor() {
    super();
    // Graceful degradation: don't crash when API key is missing
    if (resendConfig.apiKey) {
      this.client = new Resend(resendConfig.apiKey);
    } else {
      console.warn("[ResendProvider] Missing RESEND_API_KEY — emails disabled");
      this.client = null;
    }
  }

  async send(payload: NotificationPayload): Promise<SendResult> {
    if (!this.client) {
      return { success: false, error: "Resend API key not configured" };
    }
    try {
      const template = EmailTemplates[payload.template];
      if (!template) {
        return { success: false, error: `Unknown template: ${payload.template}` };
      }

      const html = template.body(payload.data);

      const { data, error } = await this.client.emails.send({
        from: resendConfig.fromEmail,
        to: payload.to,
        subject: template.subject,
        html,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, providerRef: data?.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Resend send failed",
      };
    }
  }
}