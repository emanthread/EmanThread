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
import { smsConfig, notificationDefaults, whatsappConfig, assertSMSServerlessSafe } from "./config";
import { EmailTemplates, SMSTemplates, WhatsAppTemplates } from "./templates";
import { prisma } from "@/lib/db";
import type { NotificationPayload, SendResult, NotificationChannel } from "./types";

const emailProvider = new ResendProvider();
const whatsappProvider = new WhatsAppProvider();
const smsProvider =
  smsConfig.provider === "sendpk" ? new SendPKProvider() : new PakistanSMSProvider();

// Hard runtime guard: block SendPK on Vercel at startup
assertSMSServerlessSafe();

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
 * Attempt to send an SMS with built-in retry. The SendPK provider has its own
 * internal retry, but this wrapper catches any provider-level throw to guarantee
 * we never crash the orchestrator.
 */
async function sendSMS(payload: NotificationPayload): Promise<SendResult> {
  try {
    return await smsProvider.send(payload);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "SMS provider threw unexpectedly",
    };
  }
}

/**
 * Exponential backoff: 2^attempt * 1000ms + up to 500ms jitter, capped at 32s.
 */
function backoffDelay(attempt: number): number {
  const base = Math.pow(2, attempt) * 1000;
  const jitter = Math.floor(Math.random() * 500);
  return Math.min(base + jitter, 32_000);
}

/**
 * Persist a failed notification to the database after all retries are exhausted.
 * Fire-and-forget — never throws.
 */
async function persistFailure(
  payload: NotificationPayload,
  channel: NotificationChannel,
  errorMessage: string,
  attemptCount: number,
): Promise<void> {
  try {
    await prisma.failedNotification.create({
      data: {
        orderId: payload.orderId ?? null,
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
        errorMessage,
        attemptCount,
      },
    });
  } catch (logErr) {
    console.error("[notifications] Failed to persist failure record:", logErr);
  }
}

/**
 * Send a single notification via the given provider with exponential backoff retry.
 * Used for email and WhatsApp where retry is handled at this level.
 * After all retries exhausted, persists a FailedNotification record.
 */
async function sendWithRetry(
  provider: { send(p: NotificationPayload): Promise<SendResult> },
  payload: NotificationPayload,
  channel: NotificationChannel,
  maxRetries = 3,
): Promise<SendResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await provider.send(payload);
      if (result.success) return result;
      // Provider returned a non-throw failure — retry if we have attempts left
      if (attempt === maxRetries) {
        await persistFailure(payload, channel, result.error ?? "Provider returned failure", attempt);
        return result;
      }
      await new Promise((r) => setTimeout(r, backoffDelay(attempt)));
    } catch (err) {
      if (attempt === maxRetries) {
        const errorMessage = err instanceof Error ? err.message : "Provider threw unexpectedly";
        await persistFailure(payload, channel, errorMessage, attempt);
        return { success: false, error: errorMessage };
      }
      await new Promise((r) => setTimeout(r, backoffDelay(attempt)));
    }
  }
  return { success: false, error: "Max retries exceeded" };
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
 * When payload.channels IS explicitly provided:
 *   - Those channels are attempted.
 *   - If SMS fails AND email is available (payload.to contains "@"),
 *     email is sent as a hard fallback so the customer is NEVER left
 *     in the dark.
 *
 * All provider I/O is deferred into `after()` so it executes *after* the
 * HTTP response is flushed, preventing serverless freeze-before-send.
 *
 * Returns void — callers must NOT await this; it is fire-and-forget by design.
 */
export function triggerNotification(payload: NotificationPayload): void {
  after(async () => {
    try {
      const isEmailAddress = payload.to.includes("@");
      const resolvedPhone = payload.phone || (!isEmailAddress ? payload.to : undefined);
      const hasPhone = Boolean(resolvedPhone?.trim());

      // ── Inject orderId into data for templates ──────────────
      if (payload.orderId && payload.data && !payload.data.orderId) {
        payload.data.orderId = payload.orderId;
      }

      // ── If caller explicitly specifies channels, honour them ──────────
      if (payload.channels && payload.channels.length > 0) {
        const results: Array<{ channel: NotificationChannel; result: SendResult }> = [];

        for (const channel of payload.channels) {
          let result: SendResult;

          if (channel === "email") {
            result = await sendWithRetry(emailProvider, payload, "email");
          } else {
            // Both whatsapp and sms require a valid phone number.
            const phoneFallback = payload.phone || (!payload.to.includes("@") ? payload.to : undefined);
            if (!phoneFallback || phoneFallback.includes("@")) {
              result = { success: false, error: `Invalid phone number for ${channel} channel` };
            } else if (channel === "whatsapp") {
              result = await sendWithRetry(whatsappProvider, { ...payload, to: phoneFallback }, "whatsapp");
            } else {
              result = await sendSMS({ ...payload, to: phoneFallback });
            }
          }

          await logAttempt(payload, channel, result);
          results.push({ channel, result });
        }

        // ── Hard fallback: if SMS failed but email is available, send email ──
        const smsFailed = results.some(
          (r) => r.channel === "sms" && !r.result.success
        );
        if (smsFailed && isEmailAddress) {
          console.warn(
            "[notifications] SMS failed for order, falling back to email:",
            results.find((r) => r.channel === "sms")?.result.error
          );
          const emailResult = await sendWithRetry(emailProvider, payload, "email");
          await logAttempt(payload, "email", emailResult);
        }

        return;
      }

      // ── Default routing ────────────────────────────────────────────────

      // Diagnostic: log if SMS can't work so admin knows why
      if (!hasPhone) {
        console.warn(
          "[notifications] No phone number available — SMS/WhatsApp will be skipped for order",
          payload.orderId,
          "(to:",
          payload.to,
          "phone:",
          payload.phone || "none",
          ")"
        );
      }
      if (!notificationDefaults.smsEnabled) {
        console.warn(
          "[notifications] SMS is DISABLED via configuration (NOTIFICATION_SMS_ENABLED is not 'true'). " +
          "Set NOTIFICATION_SMS_ENABLED=true in environment variables to enable SMS."
        );
      }

      // 1. Email — always attempt
      if (isEmailAddress) {
        const emailResult = await sendWithRetry(emailProvider, payload, "email");
        await logAttempt(payload, "email", emailResult);
        if (!emailResult.success) {
          console.error("[notifications] Email delivery failed:", emailResult.error);
        }
      }

      // 2. Mobile — sequential fallback
      if (hasPhone) {
        const whatsappConfigured =
          Boolean(whatsappConfig.apiKey) && Boolean(whatsappConfig.phoneNumberId);

        let mobileDelivered = false;

        // 2a. WhatsApp first
        if (whatsappConfigured && notificationDefaults.enabledChannels.includes("whatsapp" as any)) {
          const waResult = await sendWithRetry(whatsappProvider, { ...payload, to: resolvedPhone! }, "whatsapp");
          await logAttempt({ ...payload, to: resolvedPhone! }, "whatsapp", waResult);
          if (waResult.success) {
            mobileDelivered = true;
          } else {
            console.warn("[notifications] WhatsApp delivery failed, falling back to SMS:", waResult.error);
          }
        }

        // 2b. SMS fallback — only if WhatsApp was not delivered
        if (!mobileDelivered && notificationDefaults.smsEnabled) {
          const smsResult = await sendSMS({ ...payload, to: resolvedPhone! });
          await logAttempt({ ...payload, to: resolvedPhone! }, "sms", smsResult);
          if (!smsResult.success) {
            console.error("[notifications] SMS delivery failed:", smsResult.error);
          }
        }
      }
    } catch (outerErr) {
      console.error("[notifications] Orchestrator crashed:", outerErr);
    }
  });
}

/**
 * Special parallel dispatch mode ONLY for delivery updates.
 * This guarantees Email and SMS are fired simultaneously (using Promise.allSettled)
 * without touching the core fallback chain or getting delayed by retries.
 * Bypasses WhatsApp completely.
 * 
 * IMPORTANT: This does NOT use after() internally. The caller (e.g. API route)
 * MUST wrap the call in after() if serverless background execution is needed.
 * 
 * @returns Summary of dispatch results
 */
export async function sendDeliveryUpdateParallel(
  payload: NotificationPayload
): Promise<{
  email: "fulfilled" | "rejected" | "skipped";
  sms: "fulfilled" | "rejected" | "skipped";
}> {
  const isEmailAddress = payload.to.includes("@");
  const resolvedPhone = payload.phone || (!isEmailAddress ? payload.to : undefined);
  const hasPhone = Boolean(resolvedPhone?.trim());

  // ── Inject orderId into data for templates ──────────────
  if (payload.orderId && payload.data && !payload.data.orderId) {
    payload.data.orderId = payload.orderId;
  }

  const correlationId = `parallel-${payload.orderId}-${payload.template}`;
  console.info(`[notifications] [${correlationId}] Starting parallel dispatch...`);

  const summary = {
    email: "skipped" as const,
    sms: "skipped" as const,
  };

  const tasks: Promise<void>[] = [];

  // 1. Email Task
  if (isEmailAddress) {
    tasks.push(
      (async () => {
        try {
          const emailResult = await sendWithRetry(emailProvider, payload, "email");
          // Prefix error message to mark parallel mode in DB if failed
          if (!emailResult.success) {
            emailResult.error = `[ParallelMode] ${emailResult.error || "Unknown error"}`;
            summary.email = "rejected";
            console.error(`[notifications] [${correlationId}] Email delivery failed:`, emailResult.error);
          } else {
            summary.email = "fulfilled";
          }
          await logAttempt(payload, "email", emailResult);
        } catch (err) {
          summary.email = "rejected";
          console.error(`[notifications] [${correlationId}] Email task threw:`, err);
        }
      })()
    );
  } else {
    console.warn(`[notifications] [${correlationId}] No email address available — Email skipped`);
  }

  // 2. SMS Task
  if (hasPhone && notificationDefaults.smsEnabled) {
    tasks.push(
      (async () => {
        try {
          const smsPayload = { ...payload, to: resolvedPhone! };
          const smsResult = await sendSMS(smsPayload);
          // Prefix error message to mark parallel mode in DB if failed
          if (!smsResult.success) {
            smsResult.error = `[ParallelMode] ${smsResult.error || "Unknown error"}`;
            summary.sms = "rejected";
            console.error(`[notifications] [${correlationId}] SMS delivery failed:`, smsResult.error);
          } else {
            summary.sms = "fulfilled";
          }
          await logAttempt(smsPayload, "sms", smsResult);
        } catch (err) {
          summary.sms = "rejected";
          console.error(`[notifications] [${correlationId}] SMS task threw:`, err);
        }
      })()
    );
  } else if (!hasPhone) {
    console.warn(`[notifications] [${correlationId}] No phone number available — SMS skipped`);
  } else {
    console.warn(`[notifications] [${correlationId}] SMS disabled via config — SMS skipped`);
  }

  // Execute independently, no crash if one fails
  await Promise.allSettled(tasks);

  console.info(`[notifications] [${correlationId}] Parallel dispatch complete:`, summary);
  return summary;
}