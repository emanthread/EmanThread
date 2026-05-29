// ── SendPK SMS provider (Pakistan) — PTA-compliant Fixed SMS API ──
//
// SendPK has updated their API for PTA compliance. Instead of sending
// free-form text messages, we now:
//   1. Use api_key (not username+password) — no IP whitelist needed
//   2. Use a registered template_id (approved by PTA/SendPK)
//   3. Send message as JSON with variables that match the template
//   4. Only include variables the template actually uses
//
// Docs: https://sendpk.com/blog/fixed-sms-api/

import { NotificationProvider } from "./base";
import { smsConfig, sendpkTemplateIds, sendpkVariableMap, sendpkTemplateFields } from "../config";
import type { NotificationPayload, SendResult } from "../types";

/**
 * Non-retriable errors from SendPK's Fixed SMS API.
 * These indicate config/credential issues that retrying won't fix.
 */
const NON_RETRIABLE_ERRORS = new Set([
  "1",   // Invalid username/password/api_key
  "2",   // Username is empty
  "3",   // Password is empty
  "4",   // Sender ID is empty
  "5",   // Recipient is empty
  "6",   // Message is empty
  "-6",  // Message too long
  "7",   // Invalid recipient
  "8",   // Insufficient credit
  "9",   // SMS rejected
  "11",  // Invalid date for scheduled
]);

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract only the variables the template expects, applying any
 * key name mappings from sendpkVariableMap.
 */
function buildTemplateJson(
  template: string,
  data: Record<string, string>
): string {
  const expectedFields = sendpkTemplateFields[template] || [];
  const varMap = sendpkVariableMap[template] || {};
  const result: Record<string, string> = {};

  for (const field of expectedFields) {
    // Check if this field name has a mapping from code key → template key
    const sourceKey = Object.keys(varMap).find((k) => varMap[k] === field);
    if (sourceKey && data[sourceKey]) {
      result[field] = data[sourceKey];
    } else if (data[field]) {
      result[field] = data[field];
    }
    // If neither sourceKey nor data[field] is available, omit the field
    // SendPK will use the template's default for that field
  }

  // Check for unmapped keys that still need to go through the mapping
  for (const [codeKey, templateKey] of Object.entries(varMap)) {
    if (data[codeKey] && !result[templateKey]) {
      result[templateKey] = data[codeKey];
    }
  }

  return JSON.stringify(result);
}

export class SendPKProvider extends NotificationProvider {
  readonly channel = "sms";

  async send(payload: NotificationPayload): Promise<SendResult> {
    try {
      const { apiToken, senderId, sender } = smsConfig.sendpk;

      // Minimum credentials: apiToken OR (username + password)
      if (!apiToken && (!smsConfig.sendpk.username || !smsConfig.sendpk.password)) {
        return { success: false, error: "SendPK credentials not configured" };
      }

      // Get the template ID for this notification type
      const templateId = sendpkTemplateIds[payload.template];
      if (!templateId) {
        return {
          success: false,
          error: `No SendPK template ID configured for ${payload.template}`,
        };
      }

      // Normalise Pakistan phone number
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

      // Build the JSON message for the template variables
      const messageJson = buildTemplateJson(payload.template, payload.data);

      // Use the numeric sender ID (PTA short code) if available, else the text sender
      const resolvedSender = senderId || sender || "EmanThread";

      // Build query params
      const params = new URLSearchParams();
      if (apiToken) {
        params.set("api_key", apiToken);
      } else {
        params.set("username", smsConfig.sendpk.username);
        params.set("password", smsConfig.sendpk.password);
      }
      params.set("sender", resolvedSender);
      params.set("mobile", recipientPhone);
      params.set("template_id", templateId);
      params.set("message", messageJson);

      // Retry loop with exponential backoff (1s, 2s, 4s)
      const MAX_RETRIES = 3;
      let lastError: string | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await fetch(
            `http://sendpk.com/api/sms.php?${params.toString()}`,
            { signal: AbortSignal.timeout(15000) }
          );

          const text = (await response.text()).trim();

          // Success: SendPK returns OK:messageId or {"success":"true",...}
          if (text.startsWith("OK")) {
            const id = text.includes(":") ? text.split(":")[1]?.trim() : text;
            return { success: true, providerRef: id || text };
          }

          // Parse JSON response (some endpoints return JSON)
          let parsed: any = null;
          try {
            parsed = JSON.parse(text);
          } catch {
            // Not JSON, continue with raw text
          }

          if (parsed?.success === "true" || parsed?.success === true) {
            const msgId = parsed?.results?.[0]?.messageid || parsed?.results?.[0]?.id;
            return { success: true, providerRef: msgId };
          }

          // Extract error code from JSON or raw text
          const errorCode =
            (parsed?.results?.[0]?.status as string) ?? text;

          // Non-retriable — return immediately
          if (
            NON_RETRIABLE_ERRORS.has(errorCode) ||
            NON_RETRIABLE_ERRORS.has(text)
          ) {
            const errorMsg =
              parsed?.results?.[0]?.error ||
              errorCode ||
              text;
            return { success: false, error: `SendPK: ${errorMsg}` };
          }

          // Retriable — save and retry
          lastError = parsed?.results?.[0]?.error || text;
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