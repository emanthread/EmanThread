import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("privacy policy uses the correct brand and covers every requested data flow", () => {
  const policy = source("app/privacy-policy/page.tsx");

  expect(policy).not.toMatch(/Emaan Threads?/i);
  expect(policy).not.toContain("privacy@emaanthreads.com");
  expect(policy).toContain("Facebook, Instagram, and Meta Lead Forms");
  expect(policy).toContain("mobile or WhatsApp number");
  expect(policy).toContain("Men, Women, or Teens");
  expect(policy).toContain("Transactional and marketing communications");
  expect(policy).toContain("Marketing Preferences");
  expect(policy).toContain("authorized Eman Thread");
  expect(policy).toContain("does not sell or commercially trade");
  expect(policy).toContain("DeepSeek");
  expect(policy).toContain("does not write chat transcripts");
});

test("marketing consent remains channel-specific and is not requested during checkout", () => {
  const schema = source("prisma/schema.prisma");
  const migration = source(
    "prisma/migrations/20260920000000_marketing_privacy_consent/migration.sql",
  );
  const checkout = source("app/checkout/page.tsx");
  const orders = source("app/api/orders/route.ts");

  expect(schema).toContain("whatsappMarketingConsent Boolean");
  expect(schema).toContain("phoneMarketingConsent");
  expect(migration).toContain('"whatsappMarketingConsent" BOOLEAN NOT NULL DEFAULT false');
  expect(migration).toContain('"phoneMarketingConsent" BOOLEAN NOT NULL DEFAULT false');
  expect(checkout).not.toContain("Communication preferences (optional)");
  expect(orders).toContain("whatsappTransactionalConsent: whatsappConsent === true");
  expect(orders).toContain('source: "checkout"');
});

test("tracking is consent gated and browser/server Meta events share an event id", () => {
  const tracking = source("components/storefront-tracking.tsx");
  const consent = source("lib/tracking-consent.ts");
  const browser = source("lib/meta-browser.ts");
  const api = source("app/api/meta/events/route.ts");

  expect(tracking).toContain('consent !== "granted"');
  expect(consent).toContain('? value : "granted"');
  expect(tracking).toContain('window.fbq?.("consent", "revoke")');
  expect(tracking).toContain("eventID: id");
  expect(browser).toContain('readTrackingConsent() !== "granted"');
  expect(browser).toContain("eventId: id");
  expect(api).toContain("analyticsConsent: z.literal(true)");
  expect(api).toContain("sendMetaServerEvent");
});

test("Meta lead webhook verifies signatures and never infers marketing consent", () => {
  const webhook = source("app/api/meta/lead-webhook/route.ts");

  expect(webhook).toContain("x-hub-signature-256");
  expect(webhook).toContain("timingSafeEqual");
  expect(webhook).toContain("META_WEBHOOK_VERIFY_TOKEN");
  expect(webhook).toContain("whatsapp_marketing_consent");
  expect(webhook).toContain("phone_call_marketing_consent");
  expect(webhook).toContain("explicitConsent(whatsappConsent)");
  expect(webhook).toContain("explicitConsent(phoneConsent)");
});

test("customers have working self-service marketing opt-out code paths", () => {
  const page = source("app/marketing-preferences/page.tsx");
  const route = source("app/api/marketing-preferences/route.ts");
  const account = source("app/account/settings/page.tsx");

  expect(page).toContain('fetch("/api/marketing-preferences"');
  expect(route).toContain("stopWhatsApp");
  expect(route).toContain("stopPhoneCalls");
  expect(route).toContain('source: "privacy_opt_out"');
  expect(account).toContain("whatsappMarketingConsent");
  expect(account).toContain("phoneMarketingConsent");
});

test("AI chat warns customers before their message is submitted", () => {
  const chat = source("components/chat-widget.tsx");

  expect(chat).toContain("Messages are processed by our AI provider");
  expect(chat).toContain("Do not share passwords");
  expect(chat).toContain("/privacy-policy#ai-chat");
});
