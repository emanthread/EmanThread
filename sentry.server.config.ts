// ── Sentry Server-Side Configuration ────────────────────────────────
// This file configures the Sentry Node.js SDK for the Next.js server.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || "";

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Capture 100% of server transactions for debugging
    tracesSampleRate: 1.0,
    enabled: process.env.NODE_ENV === "production",
  });
}
