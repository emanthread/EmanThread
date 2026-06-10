// ── Sentry Edge Runtime Configuration ───────────────────────────────
// This file configures the Sentry JavaScript SDK for the Edge Runtime.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || "";

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    enabled: process.env.NODE_ENV === "production",
  });
}
