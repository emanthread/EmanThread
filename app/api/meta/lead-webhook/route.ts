import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { updateMarketingConsent } from "@/lib/marketing-consent";

export const dynamic = "force-dynamic";

interface LeadField {
  name?: string;
  values?: unknown[];
}

function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signature.slice("sha256=".length);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

function firstValue(fields: LeadField[], names: string[]) {
  const match = fields.find((field) => names.includes((field.name ?? "").toLowerCase()));
  const value = match?.values?.[0];
  return typeof value === "string" ? value.trim() : "";
}

function explicitConsent(value: string) {
  return ["yes", "true", "1", "accepted", "agree", "agreed", "opted_in"].includes(
    value.trim().toLowerCase().replace(/\s+/g, "_"),
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  const appSecret = process.env.META_APP_SECRET;
  const accessToken = process.env.META_LEAD_ACCESS_TOKEN;
  const graphVersion = process.env.META_GRAPH_API_VERSION;
  const rawBody = await request.text();

  if (!appSecret || !accessToken || !graphVersion) {
    return NextResponse.json({ error: "Meta lead integration is not configured" }, { status: 503 });
  }
  if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const entries =
    typeof payload === "object" && payload !== null && "entry" in payload
      ? (payload as { entry?: unknown[] }).entry ?? []
      : [];
  const leadIds: string[] = [];

  for (const entry of entries) {
    if (typeof entry !== "object" || entry === null || !("changes" in entry)) continue;
    const changes = (entry as { changes?: unknown[] }).changes ?? [];
    for (const change of changes) {
      if (typeof change !== "object" || change === null) continue;
      const typed = change as { field?: string; value?: { leadgen_id?: string } };
      if (typed.field === "leadgen" && typed.value?.leadgen_id) {
        leadIds.push(typed.value.leadgen_id);
      }
    }
  }

  let processed = 0;
  for (const leadId of [...new Set(leadIds)].slice(0, 100)) {
    const response = await fetch(
      "https://graph.facebook.com/" +
        graphVersion +
        "/" +
        encodeURIComponent(leadId) +
        "?fields=id,created_time,field_data,form_id,ad_id,platform&access_token=" +
        encodeURIComponent(accessToken),
      { cache: "no-store" },
    );
    if (!response.ok) {
      console.error("[meta-leads] Could not retrieve lead", leadId, response.status);
      continue;
    }

    const lead = (await response.json()) as { id?: string; field_data?: LeadField[] };
    const fields = Array.isArray(lead.field_data) ? lead.field_data : [];
    const phone = firstValue(fields, [
      "phone_number",
      "phone",
      "mobile_number",
      "whatsapp_number",
    ]);
    if (!phone) continue;

    const firstName = firstValue(fields, ["first_name"]);
    const lastName = firstValue(fields, ["last_name"]);
    const fullName =
      firstValue(fields, ["full_name", "name"]) || [firstName, lastName].filter(Boolean).join(" ");
    const whatsappConsent = firstValue(fields, [
      "whatsapp_marketing_consent",
      "whatsapp_consent",
    ]);
    const phoneConsent = firstValue(fields, [
      "phone_call_marketing_consent",
      "phone_marketing_consent",
      "call_consent",
    ]);

    await updateMarketingConsent({
      phone,
      name: fullName,
      email: firstValue(fields, ["email"]),
      city: firstValue(fields, ["city"]),
      interest: firstValue(fields, ["interest", "category", "department"]),
      source: "meta_lead_form",
      whatsappMarketingConsent: explicitConsent(whatsappConsent),
      phoneMarketingConsent: explicitConsent(phoneConsent),
      metaLeadId: lead.id ?? leadId,
    });
    processed += 1;
  }

  return NextResponse.json({ received: true, processed });
}
