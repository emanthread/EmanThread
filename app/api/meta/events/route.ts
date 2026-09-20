import { NextResponse } from "next/server";
import { z } from "zod";
import { validateCsrf } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limiter";
import { sendMetaServerEvent } from "@/lib/meta-conversions";

export const dynamic = "force-dynamic";

const schema = z.object({
  analyticsConsent: z.literal(true),
  eventName: z.enum(["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"]),
  eventId: z.string().min(8).max(120),
  eventSourceUrl: z.string().url().max(2048),
  customData: z
    .object({
      currency: z.string().length(3).optional(),
      value: z.number().finite().nonnegative().optional(),
      content_ids: z.array(z.string().min(1).max(191)).max(100).optional(),
      content_type: z.string().max(50).optional(),
    })
    .optional(),
});

function cookieValue(header: string, name: string) {
  const item = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(name + "="));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : undefined;
}

export async function POST(request: Request) {
  try {
    await validateCsrf(request);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const limit = checkRateLimit("meta-event:" + (ip ?? "anonymous"), {
    windowMs: 60_000,
    maxRequests: 60,
    keyPrefix: "meta-event",
  });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const result = schema.safeParse(await request.json());
  if (!result.success) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const delivery = await sendMetaServerEvent({
    eventName: result.data.eventName,
    eventId: result.data.eventId,
    eventSourceUrl: result.data.eventSourceUrl,
    clientIpAddress: ip,
    clientUserAgent: request.headers.get("user-agent") ?? undefined,
    fbp: cookieValue(cookieHeader, "_fbp"),
    fbc: cookieValue(cookieHeader, "_fbc"),
    customData: result.data.customData,
  });

  return NextResponse.json(delivery, { status: delivery.sent ? 200 : 202 });
}
