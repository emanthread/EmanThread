// Feature flags — change here to toggle features globally
// Set MANUAL_PAYMENT_MODE = false to re-enable online payment gateways

export const FEATURE_FLAGS = {
  // When true: shows only Nayapay + Meezan Bank, hides gateway integrations
  MANUAL_PAYMENT_MODE: true,

  // When true: shows WhatsApp consent section at checkout
  CHECKOUT_WHATSAPP_CONSENT: false,

  // Payment account details (admin configures these)
  NAYAPAY_ACCOUNT_NUMBER: process.env.NEXT_PUBLIC_NAYAPAY_ACCOUNT || 'samar.abbas636@nayapay',
  NAYAPAY_ACCOUNT_NAME: process.env.NEXT_PUBLIC_NAYAPAY_NAME || 'Samar Abbas',
  NAYAPAY_PHONE: process.env.NEXT_PUBLIC_NAYAPAY_PHONE || '+92 302 2996677',

  MEEZAN_IBAN: process.env.NEXT_PUBLIC_MEEZAN_IBAN || 'PK51MEZN0003260114999042',
  MEEZAN_ACCOUNT_NAME: process.env.NEXT_PUBLIC_MEEZAN_ACCOUNT_NAME || 'EMAN THREAD',
  MEEZAN_BRANCH: process.env.NEXT_PUBLIC_MEEZAN_BRANCH || 'Meezan Bank',
  MEEZAN_ACCOUNT_NUMBER: process.env.NEXT_PUBLIC_MEEZAN_ACCOUNT_NUMBER || '03260114999042',

  // Admin email alerts — triggers email to admin(s) when a manual payment is submitted
  ADMIN_EMAIL_ALERTS: true,

  // Admin browser push notifications — shows browser notification for new pending payments
  ADMIN_PUSH_ALERTS: true,
} as const

export const DEFAULT_STITCHING_FEE = Number(process.env.NEXT_PUBLIC_DEFAULT_STITCHING_FEE || 2500);