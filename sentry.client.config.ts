// ── Sentry Client-Side Configuration ────────────────────────────────
// This file configures the Sentry JavaScript SDK for the browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || "";

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Performance monitoring — capture 20% of transactions
    tracesSampleRate: 0.2,
    // Only send errors from production
    enabled: process.env.NODE_ENV === "production",
    // Don't send session replays (privacy/performance)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Ignore common non-actionable errors
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Network request failed",
      "AbortError",
    ],
  });
}
