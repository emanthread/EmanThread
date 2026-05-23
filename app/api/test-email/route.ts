// ── Resend test endpoint (TESTING ONLY — remove before production) ──
// GET  /api/test-email          → shows current Resend config status
// POST /api/test-email          → sends a real test email via Resend API
//
// Usage (POST):
//   curl -X POST http://localhost:3000/api/test-email \
//        -H "Content-Type: application/json" \
//        -d '{"to":"you@example.com"}'

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// ── GET — show config status without sending anything ──────────────
export async function GET() {
  if (process.env.NODE_ENV === "production") { // FIXED: C7 — block in production
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const apiKey = process.env.RESEND_API_KEY || "";
  const fromEmail = process.env.RESEND_FROM_EMAIL || "";

  return NextResponse.json({
    resend: {
      configured: !!apiKey,
      keyPrefix: apiKey ? apiKey.slice(0, 12) + "…" : null,
      fromEmail: fromEmail || null,
    },
    hint: "POST to this endpoint with { \"to\": \"your@email.com\" } to send a test email.",
  });
}

// ── POST — fire a real test email via Resend API ───────────────────
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") { // FIXED: C7 — block in production
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const apiKey = process.env.RESEND_API_KEY || "";
  const fromEmail =
    process.env.RESEND_FROM_EMAIL ||
    (process.env.MAIL_FROM
      ? process.env.MAIL_FROM.includes("<")
        ? process.env.MAIL_FROM
        : `Eman Thread <${process.env.MAIL_FROM}>`
      : "Eman Thread <orders@emanthread.com>");

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "RESEND_API_KEY not set in .env" },
      { status: 500 }
    );
  }

  let to = fromEmail.match(/<([^>]+)>/)?.[1] || fromEmail; // default: send to self
  try {
    const body = await req.json();
    if (body?.to) to = body.to;
  } catch {
    /* no body — use default */
  }

  try {
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject: "✅ Resend Test — Eman Thread",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                    border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:#1e293b;margin-bottom:8px;">🎉 Resend is working!</h2>
          <p style="color:#64748b;line-height:1.6;">
            This test email was sent from <strong>Eman Thread</strong> via the
            Resend API.
          </p>
          <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;" />
          <table style="font-size:13px;color:#94a3b8;width:100%;border-collapse:collapse;">
            <tr><td style="padding:4px 8px 4px 0"><strong>From:</strong></td>
                <td>${fromEmail}</td></tr>
            <tr><td style="padding:4px 8px 4px 0"><strong>To:</strong></td>
                <td>${to}</td></tr>
            <tr><td style="padding:4px 8px 4px 0"><strong>Sent at:</strong></td>
                <td>${new Date().toISOString()}</td></tr>
          </table>
          <p style="margin-top:24px;font-size:12px;color:#cbd5e1;">
            Delete <code>/api/test-email</code> once integration is confirmed.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[test-email] Resend error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 502 }
      );
    }

    console.log("[test-email] Resend success:", data?.id);
    return NextResponse.json({
      success: true,
      to,
      from: fromEmail,
      id: data?.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[test-email] Resend error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}