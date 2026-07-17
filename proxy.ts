import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isStaffRole } from "@/lib/permissions";
import { canAccessAdminApi, hasValidAdminCsrf } from "@/lib/admin-api-security";
import { getClientIp } from "@/lib/client-ip";

// ── Rate limiting config by route pattern ────────────────────────
// Applied to API routes only. Limits are per-IP per-window.
const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  "/api/admin": { limit: 400, windowMs: 60_000 },
  "/api/auth/register": { limit: 5, windowMs: 60_000 },
  "/api/auth/callback/credentials": { limit: 10, windowMs: 60_000 },
  "/api/auth/forgot-password": { limit: 3, windowMs: 60_000 },
  "/api/auth/reset-password": { limit: 5, windowMs: 60_000 },
  "/api/auth/resend-verification": { limit: 3, windowMs: 60_000 },
  "/api/orders": { limit: 20, windowMs: 60_000 },
  "/api/payments/initiate": { limit: 5, windowMs: 60_000 },
  "/api/products": { limit: 100, windowMs: 60_000 },
  "/api/chat": { limit: 20, windowMs: 60_000 },
  "/api/returns": { limit: 10, windowMs: 60_000 },
  "/api/user/change-password": { limit: 5, windowMs: 60_000 },
  "/api/products/reviews": { limit: 10, windowMs: 60_000 },
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

function nextWithCsrfCookie(req: NextRequest): NextResponse {
  const response = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  if (!pathname.startsWith("/api/") && !pathname.startsWith("/_next/")) {
    const csrfCookie = req.cookies.get("csrf-token");
    if (!csrfCookie) {
      response.cookies.set("csrf-token", crypto.randomUUID(), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
    }
  }

  return response;
}

// ── Middleware ───────────────────────────────────────────────────
// Uses NextAuth v5 auth() wrapper for edge-compatible session access.
// Auth checks run server-side before any client JS loads.
export const proxy = auth((req) => {
  const { nextUrl, auth: session } = req;
  const pathname = nextUrl.pathname;

  // ── Set CSRF token cookie if not present (only on page navigations, not API calls) ──
  // ── 0. Allow public routes ──────────────────────────────────
  if (PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return nextWithCsrfCookie(req);
  }
  // Static assets
  if (/^\/(_next|images|favicon|robots|sitemap|icon|apple-icon|logo)/.test(pathname)) {
    return nextWithCsrfCookie(req);
  }

  // ── 1. Rate limiting for API routes ──────────────────────────
  if (pathname.startsWith("/api/")) {
    const rateLimitEntry = Object.entries(RATE_LIMITS).find(([pattern]) =>
      pathname.startsWith(pattern)
    );

    if (rateLimitEntry) {
      const [pattern, config] = rateLimitEntry;
      const ip = getClientIp(req);
      const key = `${ip}:${pattern}`;
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

    if (PUBLIC_API_ROUTES.some((r) => pathname.startsWith(r))) {
      return nextWithCsrfCookie(req);
    }

    // Allow guest checkout order POST, payment callbacks, order tracking GET
    if (pathname.startsWith("/api/orders") && (req.method === "GET" || req.method === "POST")) {
      return nextWithCsrfCookie(req);
    }

    // Protected API routes
    const PROTECTED_API = ["/api/user", "/api/measurements"];
    if (PROTECTED_API.some((r) => pathname.startsWith(r))) {
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return nextWithCsrfCookie(req);
    }
  }

  // ── 2. Auth protection for /admin/* and /account/* ───────────
  const isLoggedIn = !!session?.user?.id;
  const userRole = session?.user?.role;
  const isStaff = userRole ? isStaffRole(userRole) : false;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const isAdminApi = pathname.startsWith("/api/admin");
    // Allow access to the admin login page itself without auth
    if (pathname === "/admin/login") {
      return nextWithCsrfCookie(req);
    }
    if (!isLoggedIn) {
      if (isAdminApi) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/admin/login", nextUrl));
    }
    if (!isStaff) {
      if (isAdminApi) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    if (isAdminApi) {
      const permissions = session?.user?.permissions as string[] | undefined;
      if (!canAccessAdminApi(pathname, req.method, userRole || "", permissions)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!hasValidAdminCsrf(req, req.cookies.get("csrf-token")?.value)) {
        return NextResponse.json(
          { error: "Forbidden: invalid CSRF token" },
          { status: 403 }
        );
      }
    }
    return nextWithCsrfCookie(req);
  }

  if (pathname.startsWith("/account")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    return nextWithCsrfCookie(req);
  }

  return nextWithCsrfCookie(req);
});

// ── Matcher config ───────────────────────────────────────────────
// Only run middleware on routes that need it.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
