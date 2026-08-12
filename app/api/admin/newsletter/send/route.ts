import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db"; // A5.6
import { getNewsletterSubscribers } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { z } from "zod";
import { Resend } from "resend";
import { sanitizeDbError } from "@/lib/utils/errors";
import { resendConfig } from "@/lib/notifications/config";
import { escapeEmailHtml } from "@/lib/notifications/email-format";
import { newsletterUnsubscribeUrl } from "@/lib/newsletter-unsubscribe";

const sendSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(200).refine(
    (value) => !/[\r\n]/.test(value),
    "Subject cannot contain line breaks",
  ),
  body: z.string().min(1, "Body is required").max(50000),
  recipientFilter: z.literal("subscribed").default("subscribed"),
});

function newsletterHtml(body: string, unsubscribeUrl: string): string {
  const safeBody = escapeEmailHtml(body).replace(/\r?\n/g, "<br />");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#222"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;background:#f5f5f5"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff"><tr><td style="padding:28px;text-align:center;background:#1a1a1a;color:#fff;font-size:21px;font-weight:700;letter-spacing:1px">EMAN THREAD</td></tr><tr><td style="padding:32px;font-size:15px;line-height:1.7">${safeBody}</td></tr><tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #eee;text-align:center;font-size:12px;color:#777">You received this because you subscribed to Eman Thread updates.<br /><a href="${escapeEmailHtml(unsubscribeUrl)}" style="color:#555">Unsubscribe from marketing emails</a></td></tr></table></td></tr></table></body></html>`;
}

export const POST = withLoggedAdminHandler(async (request: Request) => {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // M10: Require explicit confirmation before mass send
  const { searchParams } = new URL(request.url);
  if (searchParams.get("confirm") !== "true") {
    return NextResponse.json(
      { error: "Add ?confirm=true to confirm bulk send", code: "CONFIRMATION_REQUIRED" },
      { status: 400 }
    );
  }

  // A5.6: 6-hour cooldown between campaigns
  const lastSend = await prisma.storeConfig.findUnique({ where: { key: "last_newsletter_sent_at" } });
  if (lastSend?.value) {
    const elapsed = Date.now() - new Date(lastSend.value).getTime();
    if (elapsed < 6 * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: "Please wait 6 hours between campaigns", code: "COOLDOWN" },
        { status: 429 }
      );
    }
  }

  try {
    const body = await request.json();
    const result = sendSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { subject, body: htmlBody, recipientFilter } = result.data;

    // Fetch all subscribers matching the filter (no pagination for sending)
    const { subscribers } = await getNewsletterSubscribers({
      page: 1,
      limit: 10000,
      filter: recipientFilter,
    });

    if (subscribers.length === 0) {
      return NextResponse.json(
        { error: "No subscribers match the selected filter.", code: "NO_RECIPIENTS" },
        { status: 400 }
      );
    }

    // Check for Resend API key
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Email service not configured. Set RESEND_API_KEY.", code: "NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    const resend = new Resend(apiKey);
    const fromEmail = resendConfig.fromEmail;

    // Resend batch send — up to 100 emails per batch
    const BATCH_SIZE = 100;
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);
      const emails = batch.map((sub) => {
        const unsubscribeUrl = newsletterUnsubscribeUrl(sub.email);
        return {
          from: fromEmail,
          to: sub.email,
          ...(resendConfig.replyToEmail ? { replyTo: resendConfig.replyToEmail } : {}),
          subject,
          html: newsletterHtml(htmlBody, unsubscribeUrl),
          text: `${htmlBody}\n\nUnsubscribe from marketing emails: ${unsubscribeUrl}`,
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        };
      });

      try {
        const { data, error } = await resend.batch.send(emails);

        if (error) {
          failedCount += batch.length;
          console.error("[newsletter] Resend batch error:", error);
          errors.push("Email delivery failed");
        } else if (data) {
          sentCount += batch.length;
        }
      } catch (batchErr) {
        failedCount += batch.length;
        console.error("[newsletter] Batch exception:", batchErr);
        errors.push("Email delivery failed");
      }
    }

    // A5.6: Record campaign timestamp for cooldown
    await prisma.storeConfig.upsert({
      where: { key: "last_newsletter_sent_at" },
      create: { key: "last_newsletter_sent_at", value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    });

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      total: subscribers.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("[Admin Newsletter Send] Error:", err);
    return NextResponse.json(
      { error: "Failed to send campaign.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
});
