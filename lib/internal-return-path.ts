/**
 * Accept only local application paths for post-login/profile-creation returns.
 * This deliberately rejects protocol-relative URLs and backslash variants.
 */
export function safeInternalReturnPath(
  value: string | null | undefined,
  fallback = "/account/measurements",
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://emanthread.local");
    if (parsed.origin !== "https://emanthread.local") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function withQueryValue(path: string, key: string, value: string): string {
  const safePath = safeInternalReturnPath(path);
  const parsed = new URL(safePath, "https://emanthread.local");
  parsed.searchParams.set(key, value);
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
