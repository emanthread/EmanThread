"use client";

// ── Client-side fetch wrapper with automatic CSRF token attachment ─────
// Reads the csrf-token cookie (set by proxy.ts middleware on page loads)
// and attaches it as the x-csrf-token header on mutating requests.
//
// Usage:
//   import { apiFetch } from "@/lib/api-fetch";
//   const res = await apiFetch("/api/measurements", { method: "POST", body: data });
//
// This is optional for same-origin POST/PUT/DELETE (the server-side
// validateCsrf() now also accepts same-origin requests via Origin/Referer).
// Cross-origin requests and server-to-server calls still require the header.

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrf-token="))
      ?.split("=")[1] ?? null
  );
}

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = (
    typeof init?.method === "string" ? init.method : "GET"
  ).toUpperCase();

  // Only attach CSRF header for mutating methods
  const headers = new Headers(init?.headers);
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const token = getCsrfToken();
    if (token && !headers.has("x-csrf-token")) {
      headers.set("x-csrf-token", token);
    }
  }

  return fetch(input, { ...init, headers });
}

/**
 * Convenience wrappers matching the native fetch API shape.
 */
export const apiPost = async (url: string, body: unknown, init?: RequestInit) =>
  apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...init,
  });

export const apiPut = async (url: string, body: unknown, init?: RequestInit) =>
  apiFetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...init,
  });

export const apiDelete = async (url: string, init?: RequestInit) =>
  apiFetch(url, {
    method: "DELETE",
    ...init,
  });