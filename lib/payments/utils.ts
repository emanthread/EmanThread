import { createHmac } from "crypto";

export function generateHash(data: string, salt: string): string {
  return createHmac("sha256", salt).update(data).digest("hex");
}

export function generateSecureHash(params: Record<string, string>, salt: string): string {
  const sortedKeys = Object.keys(params).sort();
  const dataString = sortedKeys.map((k) => `${k}=${params[k]}`).join("&");
  return generateHash(dataString, salt);
}

export function formatAmountForGateway(amount: number): string {
  return Math.round(amount).toString().padStart(13, "0");
}

export function generateTxnRef(): string {
  const ts = Date.now().toString();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `T${ts}${random}`;
}

/**
 * Enforce HMAC signature verification in production.
 * In sandbox mode, always returns true (no enforcement).
 * In production, returns true if valid or throws with a clear error.
 * This prevents tampered callbacks from being processed silently.
 */
export function enforceHmac(
  isSandbox: boolean,
  isValid: boolean,
  provider: string
): true {
  if (isSandbox) {
    return true;
  }
  if (!isValid) {
    throw new Error(
      `[${provider}] HMAC signature verification failed in production environment. ` +
        `Callback payload may have been tampered with. ` +
        `Set PAYMENT_ENVIRONMENT=sandbox to disable enforcement.`
    );
  }
  return true;
}
