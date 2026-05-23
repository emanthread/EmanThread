// ── Notification orchestrator ────────────────────────────────────

import { ResendProvider } from "./providers/resend";
import { PakistanSMSProvider } from "./providers/sms-pakistan";
import { SendPKProvider } from "./providers/sms-sendpk";
import { WhatsAppProvider } from "./providers/whatsapp";
import { smsConfig, notificationDefaults } from "./config";
import { EmailTemplates, SMSTemplates, WhatsAppTemplates } from "./templates";
import { prisma } from "@/lib/db";
import type { NotificationPayload, SendResult, NotificationChannel } from "./types";

const providers = {
  email: new ResendProvider(),
  whatsapp: new WhatsAppProvider(),
  sms:
    smsConfig.provider === "sendpk"
      ? new SendPKProvider()
      : new PakistanSMSProvider(),
};

/**
 * Trigger a notification across all configured channels.
 * Fire-and-forget: does not block the caller.
 * If payload.channels is provided, only those channels are used.
 */
export async function triggerNotification(
  payload: NotificationPayload
): Promise<SendResult[]> {
  let channels: NotificationChannel[];

  if (payload.channels && payload.channels.length > 0) {
    channels = payload.channels;
  } else {
    channels = [
      ...notificationDefaults.enabledChannels,
      ...(notificationDefaults.smsEnabled ? (["sms"] as const) : []),
    ];
  }

  const results = await Promise.allSettled(
    channels.map(async (channel) => {
      const provider = providers[channel];
      const result = await provider.send(payload);

      // Persist log regardless of success/failure
      if (payload.orderId) {
        try {
          await prisma.notificationLog.create({
            data: {
              orderId: payload.orderId,
              channel,
              template: payload.template,
              recipient: payload.to,
              subject:
                channel === "email"
                  ? EmailTemplates[payload.template]?.subject
                  : null,
              content:
                channel === "email"
                  ? EmailTemplates[payload.template]?.body(payload.data)
                  : channel === "sms"
                    ? SMSTemplates[payload.template](payload.data)
                    : WhatsAppTemplates[payload.template](payload.data),
              status: result.success ? "sent" : "failed",
              providerRef: result.providerRef || null,
              errorMessage: result.error || null,
            },
          });
        } catch (logErr) {
          console.error("Failed to persist notification log:", logErr);
        }
      }

      return result;
    })
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          success: false,
          error: `Channel ${channels[i]} threw: ${r.reason}`,
        }
  );
}