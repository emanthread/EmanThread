// Feature flags — change here to toggle features globally
// Set MANUAL_PAYMENT_MODE = false to re-enable online payment gateways

export const FEATURE_FLAGS = {
  // Approved catalog rollout — keep each layer independently reversible.
  // These stay disabled until catalog content, assignments, and routes are approved.
  CATALOG_HEADER_V1: process.env.NEXT_PUBLIC_CATALOG_HEADER_V1 === "true",
  CATALOG_PAGES_V1: process.env.NEXT_PUBLIC_CATALOG_PAGES_V1 === "true",
  CATALOG_ADMIN_ASSIGNMENTS_V1:
    process.env.NEXT_PUBLIC_CATALOG_ADMIN_ASSIGNMENTS_V1 === "true",

  // New merchandise profiles/variants are isolated in additive tables. Keep
  // them disabled until the reviewed migration has run on a disposable clone
  // and the production backup/rollout checklist is complete.
  COMMERCE_PROFILE_V1: process.env.NEXT_PUBLIC_COMMERCE_PROFILE_V1 === "true",

  // When true: shows only Nayapay + Meezan Bank, hides gateway integrations
  MANUAL_PAYMENT_MODE: true,

  // When true: shows WhatsApp consent section at checkout
  CHECKOUT_WHATSAPP_CONSENT: false,

  // Admin email alerts — triggers email to admin(s) when a manual payment is submitted
  ADMIN_EMAIL_ALERTS: true,

  // Admin browser push notifications — shows browser notification for new pending payments
  ADMIN_PUSH_ALERTS: true,
} as const

// Stitching fee — server-only env var (NOT NEXT_PUBLIC_ since it's config, not customer-facing)
export const DEFAULT_STITCHING_FEE = Number(process.env.DEFAULT_STITCHING_FEE || process.env.NEXT_PUBLIC_DEFAULT_STITCHING_FEE || 2500);
