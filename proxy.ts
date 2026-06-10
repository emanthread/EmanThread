import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isStaffRole } from "@/lib/permissions";

// ── Rate limiting config by route pattern ────────────────────────
// Applied to API routes only. Limits are per-IP per-window.
const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  "/api/auth/register": { limit: 5, windowMs: 60_000 },
  "/api/auth/callback/credentials": { limit: 10, windowMs: 60_000 },
  "/api/orders": { limit: 20, windowMs: 60_000 },
  "/api/payments/initiate": { limit: 5, windowMs: 60_000 },
  "/api/products": { limit: 100, windowMs: 60_000 },
  "/api/chat": { limit: 20, windowMs: 60_000 }, // 20 messages/min per IP
};

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

// ── In-memory store (best-effort in edge runtime) ────────────────
// NOTE: In serverless/edge, each isolate has its own memory.
// For production with multiple instances, upgrade to Redis (Upstash/Vercel KV).
function getStore(): Map<string, RateLimitBucket> {
  const g = globalThis as unknown as {
    __middlewareRateLimitStore?: Map<string, RateLimitBucket>;
  };
  if (!g.__middlewareRateLimitStore) {
    g.__middlewareRateLimitStore = new Map();
  }
  return g.__middlewareRateLimitStore;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfter?: number; remaining?: number } {
  const store = getStore();
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return { allowed: false, retryAfter, remaining: 0 };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count };
}

// ── Public routes (no auth required) ──────────────────────────────
const PUBLIC_ROUTES = [
  "/", "/login", "/register", "/forgot-password",
  "/shop", "/product", "/cart", "/checkout",
  "/about", "/contact", "/faqs", "/terms",
  "/privacy-policy", "/shipping", "/returns",
  "/size-guide", "/careers", "/press", "/company",
  "/story", "/support",
];

const PUBLIC_API_ROUTES = [
  "/api/products", "/api/categories", "/api/health",
  "/api/store", "/api/auth", "/api/newsletter",
  "/api/shipping/zone", "/api/chat",
  "/api/payments/callback",
];

// ── Middleware ───────────────────────────────────────────────────
// Uses NextAuth v5 auth() wrapper for edge-compatible session access.
// Auth checks run server-side before any client JS loads.
export default auth((req) => {
  const { nextUrl, auth: session, cookies } = req;
  const pathname = nextUrl.pathname;

  // ── Set CSRF token cookie if not present (only on page navigations, not API calls) ──
  if (!pathname.startsWith("/api/") && !pathname.startsWith("/_next/")) {
    const csrfCookie = cookies.get("csrf-token");
    if (!csrfCookie) {
      const token = crypto.randomUUID();
      const response = NextResponse.next();
      response.cookies.set("csrf-token", token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
      return response;
    }
  }

  // ── 0. Allow public routes ──────────────────────────────────
  if (PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return NextResponse.next();
  }
  if (PUBLIC_API_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }
  // Static assets
  if (/^\/(_next|images|favicon|robots|sitemap|icon|apple-icon|logo)/.test(pathname)) {
    return NextResponse.next();
  }

  // ── 1. Rate limiting for API routes ──────────────────────────
  if (pathname.startsWith("/api/")) {
    const rateLimitEntry = Object.entries(RATE_LIMITS).find(([pattern]) =>
      pathname.startsWith(pattern)
    );

    if (rateLimitEntry) {
      const [, config] = rateLimitEntry;
      const ip = getClientIp(req);
      const key = `${ip}:${pathname}`;
      const result = checkRateLimit(key, config.limit, config.windowMs);

      if (!result.allowed) {
        return NextResponse.json(
          { error: "Too many requests", retryAfter: result.retryAfter },
          {
            status: 429,
            headers: { "retry-after": String(result.retryAfter) },
          }
        );
      }
    }

    // Allow guest checkout order POST, payment callbacks, order tracking GET
    if (pathname.startsWith("/api/orders") && (req.method === "GET" || req.method === "POST")) {
      return NextResponse.next();
    }

    // Protected API routes
    const PROTECTED_API = ["/api/user", "/api/measurements", "/api/tailor-measurements"];
    if (PROTECTED_API.some((r) => pathname.startsWith(r))) {
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.next();
    }
  }

  // ── 2. Auth protection for /admin/* and /account/* ───────────
  const isLoggedIn = !!session;
  const userRole = session?.user?.role;
  const isStaff = userRole ? isStaffRole(userRole) : false;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    // Allow access to the admin login page itself without auth
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/admin/login", nextUrl));
    }
    if (!isStaff) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/account")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

// ── Matcher config ───────────────────────────────────────────────
// Only run middleware on routes that need it.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
