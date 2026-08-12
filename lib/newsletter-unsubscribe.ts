import { createHmac, timingSafeEqual } from "node:crypto";

function newsletterSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required for newsletter unsubscribe links");
  }
  return secret;
}

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createNewsletterUnsubscribeToken(email: string): string {
  return createHmac("sha256", newsletterSecret())
    .update(`newsletter-unsubscribe:${normalizedEmail(email)}`)
    .digest("base64url");
}

export function verifyNewsletterUnsubscribeToken(email: string, token: string): boolean {
  const expected = createNewsletterUnsubscribeToken(email);
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(token);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function newsletterUnsubscribeUrl(email: string): string {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "https://emanthread.com"
  ).replace(/\/$/, "");
  const params = new URLSearchParams({
    email: normalizedEmail(email),
    token: createNewsletterUnsubscribeToken(email),
  });
  return `${siteUrl}/api/newsletter/unsubscribe?${params.toString()}`;
}
