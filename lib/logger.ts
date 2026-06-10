// ── Structured request logger + rate limiter ─────────────────────
// Used by API routes for consistent JSON logging.
// Example: logRequest("GET", "/api/admin/orders", 200, 45, "user-123")

import { auth } from "@/auth";
import { checkRateLimit, getRateLimitFor, type RateLimitConfig } from "./rate-limiter";
import { getClientIp } from "./api-logger";

export interface LogEntry {
  ts: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  userId?: string;
  ip?: string;
}

export function logRequest(
  method: string,
  path: string,
  status: number,
  duration: number,
  userId?: string,
  ip?: string
): void {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    method,
    path,
    status,
    duration,
    userId,
    ip,
  };

  const logLine = JSON.stringify(entry);

  if (status >= 500) {
    console.error(logLine);
  } else if (status >= 400) {
    console.warn(logLine);
  } else {
    console.info(logLine);
  }
}

/**
 * Apply rate limiting to a request based on path.
 * Returns true if allowed, false if rate limited.
 */
function applyRateLimit(req: Request, config: RateLimitConfig): boolean {
  const ip = getClientIp(req);
  const result = checkRateLimit(ip, config);
  return result.allowed;
}

// ── Wrapper for admin API routes ─────────────────────────────────
// Logs every request with user ID from session. Applies admin rate limiting.
// Usage: export const GET = withLoggedAdminHandler(async (req) => { ... })
export function withLoggedAdminHandler(
  handler: (req: Request, ...args: any[]) => Promise<Response>
): (req: Request, ...args: any[]) => Promise<Response> {
  return async (req: Request, ...args: any[]) => {
    const start = Date.now();
    const url = new URL(req.url);
    let userId: string | undefined;

    try {
      const session = await auth();
      userId = session?.user?.id;
    } catch {
      // Session lookup failed — proceed without userId
    }

    // Apply rate limiting for admin routes (60 req/min)
    const config = getRateLimitFor("admin");
    if (!applyRateLimit(req, config)) {
      return Response.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const res = await handler(req, ...args);
      logRequest(req.method, url.pathname, res.status, Date.now() - start, userId);
      return res;
    } catch (error) {
      logRequest(req.method, url.pathname, 500, Date.now() - start, userId);
      throw error;
    }
  };
}

// ── Wrapper for public API routes ────────────────────────────────
// Logs + rate limits public-facing endpoints.
// Usage: export const GET = withPublicHandler(async (req) => { ... })
export function withPublicHandler(
  handler: (req: Request, ...args: any[]) => Promise<Response>,
  limitType: "public" | "auth" | "payment" = "public"
): (req: Request, ...args: any[]) => Promise<Response> {
  return async (req: Request, ...args: any[]) => {
    const start = Date.now();
    const url = new URL(req.url);

    // Apply rate limiting
    const config = getRateLimitFor(limitType);
    if (!applyRateLimit(req, config)) {
      return Response.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const res = await handler(req, ...args);
      logRequest(req.method, url.pathname, res.status, Date.now() - start);
      return res;
    } catch (error) {
      logRequest(req.method, url.pathname, 500, Date.now() - start);
      throw error;
    }
  };
}
