import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthSync } from "@/components/auth-sync";
import { ClientWidgets } from "@/app/client-widgets";
import { StorefrontTracking } from "@/components/storefront-tracking";
import { getStoreConfig } from "@/lib/db-queries";
import { getCachedPublishedCatalogSidebarNavigation } from "@/lib/db/catalog";
import { PublishedCatalogProvider } from "@/components/layout/published-catalog-provider";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://emanthread.com";

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Eman Thread",
  "url": siteUrl,
  "image": `${siteUrl}/logo-circle.png`,
  "potentialAction": {
    "@type": "SearchAction",
    "target": `${siteUrl}/women?q={search_term_string}`,
    "query-input": "required name=search_term_string"
  }
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Eman Thread",
  "url": siteUrl,
  "logo": `${siteUrl}/logo-circle.png`,
  "image": `${siteUrl}/logo-circle.png`,
  "description":
    "Discover the finest collection of premium men's unstitched fabrics. The Style Never Dies.",
  "sameAs": [
    "https://www.facebook.com/emanthread",
    "https://www.instagram.com/emanthread",
    "https://www.youtube.com/@emanthread",
    "https://www.tiktok.com/@emanthread",
  ],
};

export const metadata: Metadata = {
  title: {
    default: "Eman Thread | Premium Unstitched Fabrics",
    template: "%s | Eman Thread",
  },
  description:
    "Discover the finest collection of premium men's unstitched fabrics. The Style Never Dies.",
  keywords: [
    "premium fabrics",
    "unstitched suits",
    "men's fashion",
    "Pakistani fabrics",
    "wash n wear",
    "cotton suits",
    "boski",
  ],
  metadataBase: new URL(siteUrl),
  icons: {
    icon: "/favicon.ico?v=2",
    shortcut: "/favicon-32.png?v=2",
    apple: "/favicon-192.png?v=2",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_PK",
    url: siteUrl,
    siteName: "Eman Thread",
    title: "Eman Thread | Premium Unstitched Fabrics",
    description:
      "Discover the finest collection of premium men's unstitched fabrics. The Style Never Dies.",
    images: [
      {
        url: "/logo-circle.png",
        width: 512,
        height: 512,
        alt: "Eman Thread Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Eman Thread | Premium Unstitched Fabrics",
    description:
      "Discover the finest collection of premium men's unstitched fabrics. The Style Never Dies.",
    images: ["/logo-circle.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,     // Allow pinch-zoom (accessibility requirement)
  userScalable: true,  // Never disable user scaling
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#C9A96E" },
    { media: "(prefers-color-scheme: dark)",  color: "#131313" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // getStoreConfig owns its cache tag and invalidation policy. A second cache
  // here could retain stale analytics/settings values after an admin update.
  const [config, publishedNavigation] = await Promise.all([
    getStoreConfig(),
    getCachedPublishedCatalogSidebarNavigation().catch((error) => {
      console.error("[layout] Unable to preload catalog navigation", error);
      return [];
    }),
  ]);
  const { googleAnalyticsId, facebookPixelId } = config;
  const publishedCatalogPaths = publishedNavigation.map((item) => item.path);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="font-sans antialiased"
        suppressHydrationWarning
      >
        {/* Skip-to-content link — first focusable element for keyboard accessibility (WCAG 2.1 AA) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded focus:outline-none"
        >
          Skip to main content
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange={false}
        >
          <PublishedCatalogProvider paths={publishedCatalogPaths}>
            <div id="main-content" tabIndex={-1}>
              {children}
            </div>
          </PublishedCatalogProvider>
          <AuthSync />
          <ClientWidgets />
        </ThemeProvider>

        {/* JSON-LD structured data — afterInteractive so crawlers get it but it never blocks hydration */}
        <Script
          id="website-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
          strategy="afterInteractive"
        />

        {/* Organization JSON-LD — tells Google which logo to show in Knowledge Graph / SERPs */}
        <Script
          id="organization-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
          strategy="afterInteractive"
        />

        {/* Store analytics load only on customer-facing routes. */}
        <StorefrontTracking
          googleAnalyticsId={googleAnalyticsId}
          facebookPixelId={facebookPixelId}
        />

      </body>
    </html>
  );
}
