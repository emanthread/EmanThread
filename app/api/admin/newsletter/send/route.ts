import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db"; // A5.6
import { getNewsletterSubscribers } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { z } from "zod";
import { Resend } from "resend";
import { sanitizeDbError } from "@/lib/utils/errors";

const sendSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  body: z.string().min(1, "Body is required").max(50000),
  recipientFilter: z.enum(["all", "subscribed"]).default("subscribed"),
});

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
    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      (process.env.MAIL_FROM
        ? process.env.MAIL_FROM.includes("<")
          ? process.env.MAIL_FROM
          : `Eman Thread <${process.env.MAIL_FROM}>`
        : "Eman Thread <newsletter@emanthread.com>");

    // Resend batch send — up to 100 emails per batch
    const BATCH_SIZE = 100;
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);
      const emails = batch.map((sub) => ({
        from: fromEmail,
        to: sub.email,
        subject,
        html: htmlBody,
      }));

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