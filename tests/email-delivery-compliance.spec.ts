import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  createNewsletterUnsubscribeToken,
  verifyNewsletterUnsubscribeToken,
} from "../lib/newsletter-unsubscribe";
import { EmailTemplates } from "../lib/notifications/templates";
import { emailHtmlToText } from "../lib/notifications/email-format";

const root = process.cwd();

test("verified-domain sender remains the first-choice configuration for every email path", () => {
  const config = readFileSync(join(root, "lib/notifications/config.ts"), "utf8");
  const authEmail = readFileSync(join(root, "lib/email.ts"), "utf8");
  const newsletter = readFileSync(join(root, "app/api/admin/newsletter/send/route.ts"), "utf8");
  const adminAlerts = readFileSync(join(root, "lib/notifications/admin-alerts.ts"), "utf8");

  expect(config.indexOf("process.env.RESEND_FROM_EMAIL")).toBeLessThan(config.indexOf("process.env.MAIL_FROM"));
  expect(authEmail).toContain("const fromEmail = resendConfig.fromEmail");
  expect(newsletter).toContain("const fromEmail = resendConfig.fromEmail");
  expect(adminAlerts).toContain("from: resendConfig.fromEmail");
  expect(authEmail).toContain("text: emailHtmlToText(html)");
  expect(adminAlerts).toContain("text: emailHtmlToText(html)");
});

test("marketing email is limited to active subscribers and has signed one-click unsubscribe", () => {
  const previousSecret = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "test-newsletter-secret";
  try {
    const token = createNewsletterUnsubscribeToken("Customer@Example.com");
    expect(verifyNewsletterUnsubscribeToken("customer@example.com", token)).toBe(true);
    expect(verifyNewsletterUnsubscribeToken("other@example.com", token)).toBe(false);
  } finally {
    if (previousSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = previousSecret;
  }

  const route = readFileSync(join(root, "app/api/admin/newsletter/send/route.ts"), "utf8");
  const admin = readFileSync(join(root, "app/admin/(dashboard)/newsletter/page.tsx"), "utf8");
  expect(route).toContain('recipientFilter: z.literal("subscribed")');
  expect(route).toContain('"List-Unsubscribe-Post": "List-Unsubscribe=One-Click"');
  expect(admin).not.toContain("All (including unsubscribed)");
  expect(admin).toContain("/api/admin/newsletter/send?confirm=true");
});

test("every lifecycle email has current universal branding and a readable body", () => {
  const data = {
    orderId: "order-1",
    orderNumber: "ET-2026-123456",
    customerName: "Customer",
    total: "4,500",
    paymentMethod: "COD",
    transactionRef: "txn-1",
    trackingNumber: "track-1",
    estimatedDelivery: "3-5 business days",
    cancellationReason: "Customer request",
    requestType: "return",
    requestId: "return-1",
    reason: "Wrong size",
    nextSteps: "Pack the item",
    rejectionReason: "Outside return window",
    refundAmount: "4,500",
    completionNote: "Refund completed",
    productName: "Teen Kurta",
    sku: "TK-NAVY-M",
    stockQuantity: "2",
    threshold: "5",
  };

  for (const template of Object.values(EmailTemplates)) {
    const html = template.body(data);
    expect(html).toContain("EMAN THREAD");
    expect(html).not.toContain("Premium Unstitched Fabric for Men");
    expect(emailHtmlToText(html).length).toBeGreaterThan(40);
  }
});
