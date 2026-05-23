// ── WhatsApp Business API provider ───────────────────────────────

import { NotificationProvider } from "./base";
import { whatsappConfig, whatsappTemplateNames } from "../config";
import type { NotificationPayload, SendResult } from "../types";

export class WhatsAppProvider extends NotificationProvider {
  readonly channel = "whatsapp";

  async send(payload: NotificationPayload): Promise<SendResult> {
    try {
      const templateName = whatsappTemplateNames[payload.template];
      if (!templateName) {
        return { success: false, error: `Unknown template: ${payload.template}` };
      }

      const { apiKey, phoneNumberId, apiVersion } = whatsappConfig;

      if (!apiKey || !phoneNumberId) {
        return {
          success: false,
          error: "WhatsApp Business API not configured",
        };
      }

      // Normalize Pakistan phone number: remove non-digits, ensure 92 prefix
      let recipientPhone = payload.to.replace(/\D/g, "");
      if (recipientPhone.startsWith("0")) {
        recipientPhone = "92" + recipientPhone.slice(1);
      } else if (!recipientPhone.startsWith("92")) {
        recipientPhone = "92" + recipientPhone;
      }

      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

      // Build template parameters from payload data
      // Map common data fields to template parameter positions
      const parameters = Object.entries(payload.data).map(([_, value]) => ({
        type: "text",
        text: value,
      }));

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipientPhone,
          type: "template",
          template: {
            name: templateName,
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: parameters.slice(0, 10), // WhatsApp allows up to 10 body params
              },
            ],
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error?.message || `WhatsApp API error: ${response.status}`,
        };
      }

      return { success: true, providerRef: result.messages?.[0]?.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "WhatsApp send failed",
      };
    }
  }
}
