// ── Centralized API guards & security wrappers ───────────────────

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { Session } from "next-auth";
import { checkRateLimit, type RateLimitConfig } from "./rate-limiter";
import { getClientIp } from "./api-logger";
import { createHash, randomBytes } from "crypto";
import {
  hasPermission,
  isAdminRole,
  isStaffRole,
  type PermissionValue,
  type RoleValue,
} from "./permissions";

export interface GuardOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireStaff?: boolean;
  requirePermission?: PermissionValue;
  requireAnyPermission?: PermissionValue[];
  requireApiKey?: boolean;
  rateLimit?: RateLimitConfig;
}

export interface ApiKeyData {
  id: string;
  name: string;
  permissions: string[];
}

// ── Auth guards ──────────────────────────────────────────────────

export async function requireAuth(): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    throw new GuardError("Unauthorized", "UNAUTHORIZED", 401);
  }
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (!isAdminRole(session.user.role)) {
    throw new GuardError("Forbidden", "FORBIDDEN", 403);
  }
  return session;
}

export async function requireStaff(): Promise<Session> {
  const session = await requireAuth();
  if (!isStaffRole(session.user.role)) {
    throw new GuardError("Forbidden", "FORBIDDEN", 403);
  }
  return session;
}

export async function requirePermission(
  perm: PermissionValue
): Promise<Session> {
  const session = await requireAuth();
  const userPerms = session.user.permissions;
  const customPerms = userPerms as string[] | undefined; // L4: permissions is now Json type
  if (!hasPermission(session.user.role as RoleValue, perm, customPerms)) {
    throw new GuardError("Forbidden", "FORBIDDEN", 403);
  }
  return session;
}

// ── API key guards ───────────────────────────────────────────────

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): {
  prefix: string;
  fullKey: string;
  hash: string;
} {
  const prefix = "et_live_";
  const suffix = randomBytes(24).toString("base64url");
  const fullKey = `${prefix}${suffix}`;
  const hash = hashApiKey(fullKey);
  return { prefix, fullKey, hash };
}

export async function requireApiKey(req: Request): Promise<ApiKeyData> {
  const header = req.headers.get("x-api-key");
  if (!header) {
    throw new GuardError("API key required", "API_KEY_REQUIRED", 401);
  }

  const hash = hashApiKey(header);

  const key = await prisma.apiKey.findFirst({
    where: { keyHash: hash, active: true },
  });

  if (!key) {
    throw new GuardError("Invalid API key", "INVALID_API_KEY", 401);
  }

  // Update last used timestamp (fire-and-forget)
  prisma.apiKey
    .update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      /* silent fail */
    });

  return {
    id: key.id,
    name: key.name,
    permissions: JSON.parse(key.permissions || "[]"),
  };
}

// ── Rate limiting helper ─────────────────────────────────────────

export function applyRateLimit(
  req: Request,
  config: RateLimitConfig
): void {
  const key = getClientIp(req);
  const result = checkRateLimit(key, config);
  if (!result.allowed) {
    const error = new GuardError("Rate limit exceeded", "RATE_LIMITED", 429);
    (error as any).retryAfter = result.retryAfter;
    throw error;
  }
}

// ── Error class ──────────────────────────────────────────────────

export class GuardError extends Error {
  code: string;
  status: number;
  retryAfter?: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "GuardError";
  }
}

// ── Guard response helper ────────────────────────────────────────

export function guardErrorResponse(err: unknown): NextResponse {
  if (err instanceof GuardError) {
    const headers: Record<string, string> = {};
    if (err.retryAfter) {
      headers["retry-after"] = String(err.retryAfter);
    }
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.status, headers }
    );
  }

  // Re-throw unexpected errors so withLogging can capture them
  throw err;
}

// ── Unified wrapper ──────────────────────────────────────────────
// Usage: export const GET = withGuard(async (req) => { ... }, { requireAdmin: true, rateLimit: RateLimits.admin() })

export function withGuard(
  handler: (req: Request) => Promise<Response>,
  options: GuardOptions
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      // Rate limit first (before auth, to prevent auth abuse)
      if (options.rateLimit) {
        applyRateLimit(req, options.rateLimit);
      }

      // Auth checks
      if (options.requireAdmin) {
        await requireAdmin();
      } else if (options.requireStaff) {
        await requireStaff();
      } else if (options.requirePermission) {
        await requirePermission(options.requirePermission);
      } else if (options.requireAnyPermission) {
        const session = await requireAuth();
        const userPerms = session.user.permissions;
        const customPerms = userPerms as string[] | undefined; // L4
        const { hasAnyPermission } = await import("./permissions");
        if (
          !hasAnyPermission(session.user.role as RoleValue, options.requireAnyPermission, customPerms)
        ) {
          throw new GuardError("Forbidden", "FORBIDDEN", 403);
        }
      } else if (options.requireAuth) {
        await requireAuth();
      } else if (options.requireApiKey) {
        await requireApiKey(req);
      }

      return await handler(req);
    } catch (err) {
      return guardErrorResponse(err);
    }
  };
}