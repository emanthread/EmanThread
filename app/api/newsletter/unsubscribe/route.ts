import { NextResponse } from "next/server";
import { z } from "zod";
import { unsubscribeFromNewsletter } from "@/lib/db-queries";
import { validateCsrf } from "@/lib/csrf";
import { verifyNewsletterUnsubscribeToken } from "@/lib/newsletter-unsubscribe";

const unsubscribeSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const signedEmail = url.searchParams.get("email");
    const signedToken = url.searchParams.get("token");
    if (signedEmail && signedToken) {
      if (!verifyNewsletterUnsubscribeToken(signedEmail, signedToken)) {
        return NextResponse.json({ error: "Invalid unsubscribe link" }, { status: 403 });
      }
      await unsubscribeFromNewsletter(signedEmail);
      return NextResponse.json({ unsubscribed: true });
    }

    await validateCsrf(request);
    const body = await request.json();
    const result = unsubscribeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const subscriber = await unsubscribeFromNewsletter(email);

    if (!subscriber) {
      return NextResponse.json(
        { error: "Email not found in subscriber list.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ unsubscribed: true, subscriber });
  } catch (err) {
    console.error("[Newsletter Unsubscribe] Error:", err);
    return NextResponse.json(
      { error: "Failed to unsubscribe. Please try again.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email") || "";
  const token = url.searchParams.get("token") || "";

  if (!email || !token || !verifyNewsletterUnsubscribeToken(email, token)) {
    return new NextResponse("Invalid or expired unsubscribe link.", { status: 403 });
  }

  await unsubscribeFromNewsletter(email);
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Unsubscribed — Eman Thread</title></head><body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#222"><main style="max-width:520px;margin:64px auto;background:#fff;padding:40px;text-align:center;border-radius:8px"><h1 style="font-size:24px">You are unsubscribed</h1><p>You will no longer receive Eman Thread marketing emails.</p><a href="/" style="color:#111">Return to Eman Thread</a></main></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
