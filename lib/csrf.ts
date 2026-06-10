// ── CSRF Protection: Double-Submit Cookie Pattern ────────────────────
// Uses SameSite=Strict cookies + custom header validation.
// Every mutation API route should call validateCsrf() on POST/PUT/DELETE.

import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Set the CSRF token cookie on the response.
 * Call this on page load (e.g., in layout.tsx or middleware).
 */
export async function setCsrfCookie(): Promise<void> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CSRF_COOKIE_NAME);
  if (!existing) {
    const token = randomUUID();
    cookieStore.set(CSRF_COOKIE_NAME, token, {
      httpOnly: false,  // Must be readable by JS to send as header
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }
}

/**
 * Validate that the CSRF token in the request header matches the cookie.
 * Throws with 403 if invalid.
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
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
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