// ── Hybrid rate limiter: Upstash Redis (multi-instance) with in-memory fallback ──
// In production, set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
// for coordinated rate limiting across serverless instances.
// Without these env vars, falls back to per-instance in-memory (same behavior as before).

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Types ────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
  retryAfter?: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

// ── In-memory store (fallback) ──────────────────────────────────────

const store = new Map<string, Bucket>();

function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }
}

if (typeof globalThis !== "undefined") {
  setInterval(cleanupExpired, 5 * 60 * 1000);
}

function inMemoryCheck(key: string, config: RateLimitConfig): RateLimitResult {
  const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key;
  const now = Date.now();
  const limit = config.maxRequests;

  let bucket = store.get(fullKey);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 1, resetAt: now + config.windowMs };
    store.set(fullKey, bucket);
    return { allowed: true, remaining: limit - 1, resetAt: Math.floor(bucket.resetAt / 1000), limit };
  }

  if (bucket.count >= limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, resetAt: Math.floor(bucket.resetAt / 1000), limit, retryAfter };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, resetAt: Math.floor(bucket.resetAt / 1000), limit };
}

// ── Upstash Redis ratelimit instances ───────────────────────────────

function createUpstashRatelimit(windowMs: number, maxRequests: number): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs}ms`),
    prefix: "ratelimit",
  });
}

// ── Async check: uses Upstash when configured, falls back to in-memory ──

export async function checkRateLimitAsync(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const ratelimit = createUpstashRatelimit(config.windowMs, config.maxRequests);
  if (!ratelimit) {
    // Upstash not configured — use in-memory fallback
    return inMemoryCheck(key, config);
  }

  const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key;
  const { success, remaining, reset } = await ratelimit.limit(fullKey);

  return {
    allowed: success,
    remaining,
    resetAt: reset,
    limit: config.maxRequests,
    retryAfter: success ? undefined : Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
  };
}

// ── Sync check (in-memory only — for backward compatibility) ────────

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  return inMemoryCheck(key, config);
}

// ── Preset configurations ───────────────────────────────────────────

export const RateLimits = {
  public: (): RateLimitConfig => ({
    windowMs: 60_000,
    maxRequests: parseInt(process.env.API_RATE_LIMIT_PUBLIC || "100", 10),
    keyPrefix: "public",
  }),
  auth: (): RateLimitConfig => ({
    windowMs: 60_000,
    maxRequests: parseInt(process.env.API_RATE_LIMIT_AUTH || "5", 10),
    keyPrefix: "auth",
  }),
  admin: (): RateLimitConfig => ({
    windowMs: 60_000,
    maxRequests: parseInt(process.env.API_RATE_LIMIT_ADMIN || "60", 10),
    keyPrefix: "admin",
  }),
  payment: (): RateLimitConfig => ({
    windowMs: 60_000,
    maxRequests: parseInt(process.env.API_RATE_LIMIT_PAYMENT || "20", 10),
    keyPrefix: "payment",
  }),
  chat: (): RateLimitConfig => ({
    windowMs: 60_000,
    maxRequests: parseInt(process.env.API_RATE_LIMIT_CHAT || "20", 10),
    keyPrefix: "chat",
  }),
};

export function getRateLimitFor(type: "public" | "auth" | "admin" | "payment" | "chat"): RateLimitConfig {
  return RateLimits[type]();
}
