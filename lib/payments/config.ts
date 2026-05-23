export type PaymentEnvironment = "sandbox" | "production";

export const PAYMENT_ENVIRONMENT =
  (process.env.PAYMENT_ENVIRONMENT as PaymentEnvironment) || "sandbox";

export const isSandbox = PAYMENT_ENVIRONMENT === "sandbox";

/**
 * Production credential validation.
 * Call this at app startup (e.g. in layout.tsx or middleware) to fail fast
 * if live credentials are missing when PAYMENT_ENVIRONMENT=production.
 */
export function validateProductionCredentials(): string[] {
  if (isSandbox) return [];

  const missing: string[] = [];

  if (!process.env.JAZZCASH_MERCHANT_ID) missing.push("JAZZCASH_MERCHANT_ID");
  if (!process.env.JAZZCASH_PASSWORD) missing.push("JAZZCASH_PASSWORD");
  if (!process.env.JAZZCASH_INTEGERITY_SALT) missing.push("JAZZCASH_INTEGERITY_SALT");

  if (!process.env.EASYPAISA_STORE_ID) missing.push("EASYPAISA_STORE_ID");
  if (!process.env.EASYPAISA_HASH_KEY) missing.push("EASYPAISA_HASH_KEY");

  if (!process.env.CARD_GATEWAY_MERCHANT_ID) missing.push("CARD_GATEWAY_MERCHANT_ID");
  if (!process.env.CARD_GATEWAY_API_KEY) missing.push("CARD_GATEWAY_API_KEY");
  if (!process.env.CARD_GATEWAY_ENDPOINT) missing.push("CARD_GATEWAY_ENDPOINT");

  if (!process.env.SAFEPAY_PUBLIC_KEY) missing.push("SAFEPAY_PUBLIC_KEY");
  if (!process.env.SAFEPAY_SECRET_KEY) missing.push("SAFEPAY_SECRET_KEY");

  return missing;
}

/**
 * Assert production credentials are present.
 * Throws a descriptive error if any required env var is missing.
 */
export function assertProductionCredentials(): void {
  const missing = validateProductionCredentials();
  if (missing.length > 0) {
    throw new Error(
      `[PAYMENT_ENVIRONMENT=production] Missing required payment credentials: ${missing.join(", ")}. ` +
        `Set them in Vercel Dashboard → Project → Environment Variables before deploying.`
    );
  }
}

export const jazzcashConfig = {
  merchantId: process.env.JAZZCASH_MERCHANT_ID || "",
  password: process.env.JAZZCASH_PASSWORD || "",
  integritySalt: process.env.JAZZCASH_INTEGERITY_SALT || "",
  returnUrl:
    process.env.JAZZCASH_RETURN_URL ||
    `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/payments/callback/jazzcash`,
  endpoint: isSandbox
    ? "https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction"
    : "https://payments.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction",
};

export const easypaisaConfig = {
  storeId: process.env.EASYPAISA_STORE_ID || "",
  hashKey: process.env.EASYPAISA_HASH_KEY || "",
  returnUrl:
    process.env.EASYPAISA_RETURN_URL ||
    `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/payments/callback/easypaisa`,
  endpoint: isSandbox
    ? "https://easypaystg.easypaisa.com.pk/tpg"
    : "https://easypay.easypaisa.com.pk/tpg",
};

export const cardGatewayConfig = {
  merchantId: process.env.CARD_GATEWAY_MERCHANT_ID || "",
  apiKey: process.env.CARD_GATEWAY_API_KEY || "",
  endpoint:
    process.env.CARD_GATEWAY_ENDPOINT ||
    (isSandbox
      ? "https://sandbox-gateway.example.com/api/v1"
      : "https://gateway.example.com/api/v1"),
  returnUrl:
    process.env.CARD_GATEWAY_RETURN_URL ||
    `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/payments/callback/card`,
};

export const safepayConfig = {
  publicKey: process.env.SAFEPAY_PUBLIC_KEY || "",
  secretKey: process.env.SAFEPAY_SECRET_KEY || "",
  apiBase: isSandbox
    ? "https://sandbox.api.getsafepay.com"
    : "https://api.getsafepay.com",
  checkoutBase: isSandbox
    ? "https://sandbox.getsafepay.com"
    : "https://checkout.getsafepay.com",
  returnUrl:
    process.env.SAFEPAY_RETURN_URL ||
    `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/payments/callback/safepay`,
  webhookSecret: process.env.SAFEPAY_WEBHOOK_SECRET || "",
};
