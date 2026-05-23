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

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

function logRequest(entry: ApiLogEntry): void {
  const logLine = JSON.stringify(entry);
  if (entry.statusCode >= 500) {
    console.error(logLine);
  } else if (entry.statusCode >= 400) {
    console.warn(logLine);
  } else {
    console.log(logLine);
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