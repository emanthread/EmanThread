// ── Structured API request logging ───────────────────────────────

import { NextResponse } from "next/server";
import type { Session } from "next-auth";

export interface ApiLogEntry {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip: string;
  userAgent: string;
  userId?: string;
  apiKeyId?: string;
  error?: string;
}

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[0-9a-fA-F:]+$/;

function isValidIp(raw: string): boolean {
  return IPV4_RE.test(raw) || IPV6_RE.test(raw);
}

/**
 * Extract the real client IP address.
 *
 * On Vercel: the LAST value in x-forwarded-for is the one Vercel's infrastructure
 * prepended — it is the real client IP and cannot be spoofed by the client.
 * Reading the FIRST value is trivially spoofable by prepending any IP.
 * x-real-ip is a single-value header set by the proxy; use it when available.
 */
function getClientIp(req: Request): string {
  // Prefer x-real-ip when available (single value, set by proxy)
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    if (isValidIp(realIp.trim())) return realIp.trim();
    return "invalid";
  }
  // Fall back to x-forwarded-for — last IP is the origin (Vercel trust model)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const last = forwarded.split(",").at(-1)?.trim();
    if (last && isValidIp(last)) return last;
    return "invalid";
  }
  return "unknown";
}

function logRequest(entry: ApiLogEntry): void {
  const logLine = JSON.stringify(entry);
  if (entry.statusCode >= 500) {
    console.error(logLine);
  } else if (entry.statusCode >= 400) {
    console.warn(logLine);
  } else {
    console.info(logLine);
  }
}

export function withLogging(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const id = crypto.randomUUID();
    const start = Date.now();
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "unknown";
    const url = new URL(req.url);
    const path = url.pathname;

    try {
      const res = await handler(req);

      const entry: ApiLogEntry = {
        id,
        timestamp: new Date().toISOString(),
        method: req.method,
        path,
        statusCode: res.status,
        durationMs: Date.now() - start,
        ip,
        userAgent,
      };

      logRequest(entry);

      // Add request ID header to response for tracing
      const modified = new NextResponse(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
      modified.headers.set("x-request-id", id);
      return modified;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const entry: ApiLogEntry = {
        id,
        timestamp: new Date().toISOString(),
        method: req.method,
        path,
        statusCode: 500,
        durationMs: Date.now() - start,
        ip,
        userAgent,
        error: message,
      };
      logRequest(entry);
      throw error;
    }
  };
}

export { getClientIp };