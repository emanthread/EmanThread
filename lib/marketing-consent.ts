import "server-only";

import { prisma } from "@/lib/db";

export const MARKETING_CONSENT_VERSION = "2026-09-20";

export function normalizeMarketingPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = "92" + digits.slice(1);
  if (!digits.startsWith("92") && digits.length === 10) digits = "92" + digits;
  if (digits.length < 7 || digits.length > 15) {
    throw new Error("Please enter a valid phone or WhatsApp number.");
  }
  return digits;
}

export interface MarketingConsentInput {
  phone: string;
  name?: string;
  email?: string;
  city?: string;
  interest?: string;
  source: "checkout" | "account" | "meta_lead_form" | "privacy_opt_out";
  whatsappMarketingConsent?: boolean;
  phoneMarketingConsent?: boolean;
  metaLeadId?: string;
}

export async function updateMarketingConsent(input: MarketingConsentInput) {
  const normalizedPhone = normalizeMarketingPhone(input.phone);
  const now = new Date();
  const hasOptIn =
    input.whatsappMarketingConsent === true || input.phoneMarketingConsent === true;

  const shared = {
    ...(input.name?.trim() ? { name: input.name.trim() } : {}),
    ...(input.email?.trim() ? { email: input.email.trim().toLowerCase() } : {}),
    ...(input.city?.trim() ? { city: input.city.trim() } : {}),
    ...(input.interest?.trim() ? { interest: input.interest.trim() } : {}),
    source: input.source,
    ...(input.metaLeadId ? { metaLeadId: input.metaLeadId } : {}),
    consentVersion: MARKETING_CONSENT_VERSION,
    ...(hasOptIn ? { consentedAt: now } : {}),
  };

  const consentUpdate = {
    ...(input.whatsappMarketingConsent !== undefined
      ? {
          whatsappMarketingConsent: input.whatsappMarketingConsent,
          whatsappOptedOutAt: input.whatsappMarketingConsent ? null : now,
        }
      : {}),
    ...(input.phoneMarketingConsent !== undefined
      ? {
          phoneMarketingConsent: input.phoneMarketingConsent,
          phoneOptedOutAt: input.phoneMarketingConsent ? null : now,
        }
      : {}),
  };

  return prisma.marketingContact.upsert({
    where: { normalizedPhone },
    create: {
      normalizedPhone,
      ...shared,
      whatsappMarketingConsent: input.whatsappMarketingConsent ?? false,
      phoneMarketingConsent: input.phoneMarketingConsent ?? false,
      whatsappOptedOutAt:
        input.whatsappMarketingConsent === false ? now : undefined,
      phoneOptedOutAt: input.phoneMarketingConsent === false ? now : undefined,
    },
    update: {
      ...shared,
      ...consentUpdate,
    },
  });
}
