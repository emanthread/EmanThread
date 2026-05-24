// ── Notification orchestrator ────────────────────────────────────
//
// Architecture:
//   - Email:   Always sent if recipient address exists.
//   - Mobile:  Sequential fallback — WhatsApp first, SMS if WhatsApp is
//              unconfigured or fails. Only ONE mobile channel fires per event.
//   - Serverless: All I/O is wrapped in Next.js `after()` so the lambda
//              cannot be frozen mid-flight by an early HTTP response return.

import { after } from "next/server";
import { ResendProvider } from "./providers/resend";
import { PakistanSMSProvider } from "./providers/sms-pakistan";
import { SendPKProvider } from "./providers/sms-sendpk";
import { WhatsAppProvider } from "./providers/whatsapp";
import { smsConfig, notificationDefaults, whatsappConfig } from "./config";
import { EmailTemplates, SMSTemplates, WhatsAppTemplates } from "./templates";
import { prisma } from "@/lib/db";
import type { NotificationPayload, SendResult, NotificationChannel } from "./types";

const emailProvider = new ResendProvider();
const whatsappProvider = new WhatsAppProvider();
const smsProvider =
  smsConfig.provider === "sendpk" ? new SendPKProvider() : new PakistanSMSProvider();

/** Persist a single delivery attempt to the audit log. Fire-and-forget safe. */
async function logAttempt(
  payload: NotificationPayload,
  channel: NotificationChannel,
  result: SendResult
) {
  if (!payload.orderId) return;
  try {
    await prisma.notificationLog.create({
      data: {
        orderId: payload.orderId,
        channel,
        template: payload.template,
        recipient: payload.to,
        subject:
          channel === "email"
            ? (EmailTemplates[payload.template]?.subject ?? null)
            : null,
        content:
          channel === "email"
            ? EmailTemplates[payload.template]?.body(payload.data)
            : channel === "sms"
              ? SMSTemplates[payload.template]?.(payload.data)
              : WhatsAppTemplates[payload.template]?.(payload.data),
        status: result.success ? "sent" : "failed",
        providerRef: result.providerRef ?? null,
        errorMessage: result.error ?? null,
      },
    });
  } catch (logErr) {
    console.error("[notifications] Failed to persist notification log:", logErr);
  }
}

/**
 * Trigger a notification for a lifecycle event.
 *
 * Channel routing (when payload.channels is not provided):
 *   1. Email — always attempted if `payload.to` contains "@".
 *   2. Mobile — sequential fallback:
 *      a. WhatsApp: tried if configured AND phone is present.
 *      b. SMS: tried if smsEnabled AND phone is present AND WhatsApp was
 *         not successfully delivered (unconfigured or failed).
 *
 * All provider I/O is deferred into `after()` so it executes *after* the
 * HTTP response is flushed, preventing serverless freeze-before-send.
 *
 * Returns void — callers must NOT await this; it is fire-and-forget by design.
 */
export function triggerNotification(payload: NotificationPayload): void {
  after(async () => {
    try {
      // ── If caller explicitly specifies channels, honour them exactly ──────
      if (payload.channels && payload.channels.length > 0) {
        const results = await Promise.allSettled(
          payload.channels.map(async (channel) => {
            let result: SendResult;
            if (channel === "email") {
              result = await emailProvider.send(payload);
            } else {
              // Both whatsapp and sms require a valid phone number.
              // We fall back to payload.to if phone is missing, but only if it's not an email.
              const phoneFallback = payload.phone || (!payload.to.includes("@") ? payload.to : undefined);
              if (!phoneFallback || phoneFallback.includes("@")) {
                 result = { success: false, error: `Invalid phone number for ${channel} channel` };
              } else if (channel === "whatsapp") {
                 result = await whatsappProvider.send({ ...payload, to: phoneFallback });
              } else {
                 result = await smsProvider.send({ ...payload, to: phoneFallback });
              }
            }
            await logAttempt(payload, channel, result);
            return result;
          })
        );
        // Log any unexpected rejections
        results.forEach((r, i) => {
          if (r.status === "rejected") {
            console.error(
              `[notifications] Channel ${payload.channels![i]} threw:`,
              r.reason
            );
          }
        });
        return;
      }

      // ── Default routing ───────────────────────────────────────────────────
      const isEmailAddress = payload.to.includes("@");
      // If phone wasn't explicitly passed, but 'to' isn't an email address, 
      // assume 'to' is the phone number.
      const resolvedPhone = payload.phone || (!isEmailAddress ? payload.to : undefined);
      const hasPhone = Boolean(resolvedPhone?.trim());

      // 1. Email — always attempt
      if (isEmailAddress) {
        try {
          const emailResult = await emailProvider.send(payload);
          await logAttempt(payload, "email", emailResult);
          if (!emailResult.success) {
            console.error("[notifications] Email delivery failed:", emailResult.error);
          }
        } catch (err) {
          console.error("[notifications] Email provider threw:", err);
        }
      }

      // 2. Mobile — sequential fallback
      if (hasPhone) {
        const whatsappConfigured =
          Boolean(whatsappConfig.apiKey) && Boolean(whatsappConfig.phoneNumberId);

        let mobileDelivered = false;

        // 2a. WhatsApp first
        if (whatsappConfigured && notificationDefaults.enabledChannels.includes("whatsapp" as any)) {
          try {
            const waResult = await whatsappProvider.send({ ...payload, to: resolvedPhone! });
            await logAttempt({ ...payload, to: resolvedPhone! }, "whatsapp", waResult);
            if (waResult.success) {
              mobileDelivered = true;
            } else {
              console.warn("[notifications] WhatsApp delivery failed, falling back to SMS:", waResult.error);
            }
          } catch (err) {
            console.error("[notifications] WhatsApp provider threw:", err);
          }
        }

        // 2b. SMS fallback — only if WhatsApp was not delivered
        if (!mobileDelivered && notificationDefaults.smsEnabled) {
          try {
            const smsResult = await smsProvider.send({ ...payload, to: resolvedPhone! });
            await logAttempt({ ...payload, to: resolvedPhone! }, "sms", smsResult);
            if (!smsResult.success) {
              console.error("[notifications] SMS delivery failed:", smsResult.error);
            }
          } catch (err) {
            console.error("[notifications] SMS provider threw:", err);
          }
        }
      }
    } catch (outerErr) {
      console.error("[notifications] Orchestrator crashed:", outerErr);
    }
  });
}