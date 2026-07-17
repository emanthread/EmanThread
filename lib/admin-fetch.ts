"use client";

import { apiFetch } from "@/lib/api-fetch";

const READ_TIMEOUT_MS = 15_000;
const WRITE_TIMEOUT_MS = 45_000;

function isWriteMethod(method?: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(
    (method || "GET").toUpperCase()
  );
}

function isAdminLoginRedirect(response: Response): boolean {
  if (!response.redirected || !response.url) return false;

  try {
    return new URL(response.url).pathname === "/admin/login";
  } catch {
    return false;
  }
}

/**
 * Admin-only fetch wrapper. Read requests fail predictably instead of waiting
 * forever, while writes get a longer window to avoid ambiguous retries.
 */
export async function adminFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const timeoutMs = isWriteMethod(init?.method)
    ? WRITE_TIMEOUT_MS
    : READ_TIMEOUT_MS;
  const timeoutController = new AbortController();
  const timeoutId = window.setTimeout(() => timeoutController.abort(), timeoutMs);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeoutController.signal])
    : timeoutController.signal;

  try {
    const response = await apiFetch(input, { ...init, signal });

    if (response.status === 401 || isAdminLoginRedirect(response)) {
      window.location.assign("/admin/login");
      throw new Error("Your admin session has expired. Please sign in again.");
    }

    return response;
  } catch (error) {
    if (timeoutController.signal.aborted && !init?.signal?.aborted) {
      throw new Error(
        isWriteMethod(init?.method)
          ? "The admin update took too long. Refresh before retrying."
          : "The admin request timed out. Please retry."
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function adminResponseError(
  response: Response,
  fallback: string
): Promise<Error> {
  const payload = await response.json().catch(() => null);
  const message =
    payload && typeof payload === "object" && "error" in payload
      ? String(payload.error)
      : fallback;
  return new Error(message);
}
