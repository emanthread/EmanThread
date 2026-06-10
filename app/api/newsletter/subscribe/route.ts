import { NextResponse } from "next/server";
import { z } from "zod";
import { subscribeToNewsletter } from "@/lib/db-queries";
import { checkRateLimit } from "@/lib/rate-limiter";
import { validateCsrf } from "@/lib/csrf";

const subscribeSchema = z.object({
  email: z.string().email("Invalid email address"),
  source: z.string().optional(),
});

export async function POST(request: Request) {
  // Rate limit: 3 per IP per hour
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`newsletter_subscribe:${ip}`, {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    keyPrefix: "newsletter",
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Too many subscription attempts. Please try again later.",
        code: "RATE_LIMITED",
        retryAfter: rateLimit.retryAfter,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfter || 3600) },
      }
    );
  }

  try {
    await validateCsrf(request);
    const body = await request.json();
    const result = subscribeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { email, source } = result.data;
    const subscriber = await subscribeToNewsletter(email, source);

    return NextResponse.json({ subscribed: true, subscriber });
  } catch (err) {
    console.error("[Newsletter Subscribe] Error:", err);
    return NextResponse.json(
      { error: "Failed to subscribe. Please try again.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}