// ── Safepay Webhook Endpoint (Testing) ───────────────────────────
// URL to register in Safepay Dashboard → Developers → Webhooks:
//   https://yourdomain.com/api/payments/webhook/safepay
//
// Safepay sends a POST with JSON body + X-SFPY-SIGNATURE header.
// This handler:
//   1. Optionally verifies the HMAC-SHA256 signature (when SAFEPAY_WEBHOOK_SECRET is set)
//   2. Logs the event payload
//   3. Returns 200 immediately (Safepay retries on non-200)
//
// For local testing use ngrok:
//   ngrok http 3000
//   → use the ngrok URL as the webhook URL in Safepay sandbox dashboard

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// ── Signature verification ────────────────────────────────────────
function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature.replace(/^sha256=/, ""), "hex")
    );
  } catch {
    return false;
  }
}

// ── Event handler (extend as needed) ─────────────────────────────
function handleEvent(event: string, data: Record<string, unknown>) {
  switch (event) {
    case "payment:created":
      console.log("[Safepay Webhook] Payment created:", data?.tracker);
      break;
    case "payment:success":
      console.log("[Safepay Webhook] ✅ Payment succeeded:", data?.tracker, "ref:", data?.reference_number);
      break;
    case "payment:failed":
      console.log("[Safepay Webhook] ❌ Payment failed:", data?.tracker);
      break;
    case "payment:reversed":
      console.log("[Safepay Webhook] ↩️  Payment reversed:", data?.tracker);
      break;
    case "refund:created":
      console.log("[Safepay Webhook] Refund created:", data?.tracker);
      break;
    case "refund:success":
      console.log("[Safepay Webhook] ✅ Refund succeeded:", data?.tracker);
      break;
    default:
      console.log(`[Safepay Webhook] Unhandled event "${event}":`, JSON.stringify(data));
  }
}

// ── POST handler ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Read raw body for signature verification
  const rawBody = await req.text();
  const webhookSecret = process.env.SAFEPAY_WEBHOOK_SECRET || "";
  const signature     = req.headers.get("x-sfpy-signature") || "";

  // ── 1. Verify signature if secret is configured ─────────────────
  if (webhookSecret) {
    if (!signature) {
      console.warn("[Safepay Webhook] Missing X-SFPY-SIGNATURE header");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    if (!verifySignature(rawBody, signature, webhookSecret)) {
      console.error("[Safepay Webhook] ⚠️  Signature mismatch — possible replay/forgery");
      return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
    }
  } else {
    // No secret set — log a warning in production, fine for sandbox testing
    if (process.env.NODE_ENV === "production") {
      console.warn("[Safepay Webhook] SAFEPAY_WEBHOOK_SECRET not set — skipping signature check (UNSAFE in production)");
    }
  }

  // ── 2. Parse payload ────────────────────────────────────────────
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("[Safepay Webhook] Invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── 3. Extract event type ───────────────────────────────────────
  // Safepay sends: { "type": "payment:success", "data": { ... } }
  const eventType = (payload.type as string) || "unknown";
  const eventData = (payload.data as Record<string, unknown>) || payload;

  console.log(`[Safepay Webhook] Received event: ${eventType}`);

  // ── 4. Handle event ─────────────────────────────────────────────
  handleEvent(eventType, eventData);

  // ── 5. Always return 200 quickly so Safepay doesn't retry ───────
  return NextResponse.json({ received: true, event: eventType }, { status: 200 });
}

// ── GET — health check / registration verification ────────────────
// Some webhook systems do a GET ping to verify the URL exists.
export async function GET() {
  return NextResponse.json({
    status:  "ok",
    webhook: "safepay",
    mode:    process.env.PAYMENT_ENVIRONMENT || "sandbox",
    signatureVerification: !!process.env.SAFEPAY_WEBHOOK_SECRET,
  });
}
