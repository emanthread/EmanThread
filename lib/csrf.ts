// ── CSRF Protection: Double-Submit Cookie Pattern ────────────────────
// Uses SameSite=Strict cookies + custom header validation.
// Every mutation API route should call validateCsrf() on POST/PUT/DELETE.
// CSRF cookie is set by the middleware (proxy.ts) on page navigations.
//
// Strategy:
//  1. If x-csrf-token header is present → require exact match with cookie (double-submit).
//  2. If no header (standard browser fetch) → verify same-origin via Origin/Referer.
//     The SameSite=Strict cookie already proves same-site navigation;
//     Origin/Referer prevents cross-origin form submissions.
//  This allows native browser fetch() calls to pass CSRF without manually
//  reading the cookie and injecting it as a header.

import { cookies } from "next/headers";

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Validate that the request originates from the same site and is not a
 * cross-origin forgery.  Throws with 403 if validation fails.
 * 
 * Usage in API routes:
 *   import { validateCsrf } from "@/lib/csrf";
 *   await validateCsrf(request);
 */
export async function validateCsrf(request: Request): Promise<void> {
  // Only validate mutating methods
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return;
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  // ── Path 1: Explicit x-csrf-token header (double-submit) ────────────
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (headerToken) {
    if (!cookieToken || cookieToken !== headerToken) {
      throw new Error("CSRF validation failed");
    }
    return;
  }

  // ── Path 2: Standard browser fetch (no custom header) ──────────────
  // Rely on SameSite=Strict cookie + Origin/Referer same-origin check.
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const url = new URL(request.url);
  const protocol = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const siteOrigin = `${protocol}://${host}`;

  const isSameOrigin =
    (origin != null && origin === siteOrigin) ||
    (referer != null && referer.startsWith(siteOrigin));

  if (!isSameOrigin) {
    throw new Error("CSRF validation failed");
  }

  // Same-origin with cookie present → legitimate browser request
  if (!cookieToken) {
    throw new Error("CSRF validation failed");
  }
}

/**
 * Helper: wrap an API route handler with CSRF protection.
 * 
 * Usage:
 *   import { withCsrf } from "@/lib/csrf";
 *   export const POST = withCsrf(async (req) => { ... });
 */
export function withCsrf<T>(
  handler: (req: Request, ...args: any[]) => Promise<Response> | Response
): (req: Request, ...args: any[]) => Promise<Response> {
  return async (req: Request, ...args: any[]) => {
    try {
      await validateCsrf(req);
      return await handler(req, ...args);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Forbidden: invalid CSRF token" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };
}