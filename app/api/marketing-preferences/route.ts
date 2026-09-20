import { NextResponse } from "next/server";
import { z } from "zod";
import { validateCsrf } from "@/lib/csrf";
import { updateMarketingConsent } from "@/lib/marketing-consent";
import { checkRateLimit } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    phone: z.string().min(7).max(40),
    stopWhatsApp: z.boolean().default(false),
    stopPhoneCalls: z.boolean().default(false),
  })
  .refine((value) => value.stopWhatsApp || value.stopPhoneCalls, {
    message: "Select at least one marketing channel to stop.",
  });

export async function POST(request: Request) {
  try {
    await validateCsrf(request);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limit = checkRateLimit("marketing-opt-out:" + ip, {
    windowMs: 60_000,
    maxRequests: 10,
    keyPrefix: "marketing-opt-out",
  });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Please wait before trying again." }, { status: 429 });
  }

  try {
    const result = schema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    await updateMarketingConsent({
      phone: result.data.phone,
      source: "privacy_opt_out",
      ...(result.data.stopWhatsApp ? { whatsappMarketingConsent: false } : {}),
      ...(result.data.stopPhoneCalls ? { phoneMarketingConsent: false } : {}),
    });

    return NextResponse.json({
      success: true,
      message: "Your marketing preferences have been updated.",
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("Please enter")
        ? error.message
        : "We could not update your preferences. Please try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
