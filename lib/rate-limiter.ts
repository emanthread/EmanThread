// ── In-memory sliding-window rate limiter ────────────────────────
// NOTE: For production with multiple server instances, upgrade to Redis.
// Compatible with Vercel KV or Upstash Redis — swap the Map for Redis.

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

const store = new Map<string, Bucket>();

// Clean up expired entries periodically to prevent memory growth
function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key;
  const now = Date.now();
  const limit = config.maxRequests;

  let bucket = store.get(fullKey);

  if (!bucket || bucket.resetAt <= now) {
    // First request or window expired — start fresh
    bucket = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    store.set(fullKey, bucket);
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: Math.floor(bucket.resetAt / 1000),
      limit,
    };
  }

  // Window is still active
  if (bucket.count >= limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: Math.floor(bucket.resetAt / 1000),
      limit,
      retryAfter,
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: limit - bucket.count,
    resetAt: Math.floor(bucket.resetAt / 1000),
    limit,
  };
}

// Periodic cleanup every 5 minutes (in serverless, this runs per instance)
if (typeof globalThis !== "undefined") {
  setInterval(cleanupExpired, 5 * 60 * 1000);
}

// Preset configurations
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
};

// Convenience helper
export function getRateLimitFor(type: "public" | "auth" | "admin" | "payment"): RateLimitConfig {
  return RateLimits[type]();
}
