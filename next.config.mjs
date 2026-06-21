// ── Force UTC timezone for consistent server-side timestamps ──────
process.env.TZ = 'UTC';

import { withSentryConfig } from "@sentry/nextjs";

// Trigger hot-restart of the Next.js dev server to reload .env database credentials
/** @type {import('next').NextConfig} */
let nextConfig = {
  // TypeScript strict mode enabled

  // ── USB / LAN mobile debugging ────────────────────────────────────────────
  // Allows the phone connected via USB (or same WiFi) to receive HMR updates.
  // Next.js 16 blocks cross-origin dev resources by default for security.
  // Add your machine's local IP here when testing on a physical device.
  // REMOVE or leave empty before deploying — dev-only config.
  allowedDevOrigins: [
    ...(process.env.DEV_IMAGE_HOST ? [process.env.DEV_IMAGE_HOST] : []),
  ],

  // Compress all HTTP responses (gzip/br)
  compress: true,

  // ── Image optimisation ────────────────────────────────────────────────────
  images: {
    // Serve modern formats — AVIF first (smaller), then WebP fallback
    formats: ['image/avif', 'image/webp'],
    // Breakpoints that match real device widths used in Pakistan
    deviceSizes: [360, 414, 768, 1024, 1280, 1440, 1920],
    // Small images (icons, thumbnails)
    imageSizes: [16, 32, 64, 128, 256],
    // 30-day CDN cache for optimised images
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Allowed remote image hosts
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  // ── Bundle size: tree-shake heavy packages ────────────────────────────────
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-accordion',
      '@radix-ui/react-popover',
      'recharts',
      'date-fns',
    ],
  },

  // ── HTTP cache headers ────────────────────────────────────────────────────
  async headers() {
    return [
      {
        // Public images served from /public/images
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        // Hero slides: public, read-only — cache 5 min, serve stale for 10 min while revalidating
        source: '/api/hero-slides',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
      {
        // Public product listing API — cache 2 min, serve stale for 5 min while revalidating
        source: '/api/products',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=120, stale-while-revalidate=300',
          },
        ],
      },
    ]
  },

  // Turbopack is disabled via --webpack flag in the dev script.
  // Turbopack has a known bug resolving PostCSS plugins (tailwindcss) from
  // the parent directory when the project path contains spaces.
}

// ── PWA (Serwist) ──────────────────────────────────────────────────
// @serwist/next is optional — the config falls through gracefully when not installed.
let serwistWrapped = nextConfig;
try {
  const { withSerwist } = await import("@serwist/next");
  serwistWrapped = withSerwist({
    ...serwistWrapped,
    swSrc: "app/sw.ts",
  });
} catch {
  // @serwist/next not installed — skip PWA config
}

export default withSentryConfig(serwistWrapped, {
  // Suppress Sentry CLI warnings (auth token, source maps) when not configured
  silent: !process.env.SENTRY_AUTH_TOKEN,
  telemetry: false,
});
