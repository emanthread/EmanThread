import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, Noto_Serif } from "next/font/google";
import Script from "next/script";
import { unstable_cache } from "next/cache";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthSync } from "@/components/auth-sync";
import { ClientWidgets } from "@/app/client-widgets";
import { getStoreConfig } from "@/lib/db-queries";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"], // Reduced from 5 weights to 2 — cuts font payload ~40%
  variable: "--font-cormorant",
  display: "swap",    // Don't block render — show fallback font immediately
  preload: false,     // Decorative heading font — not render-critical
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",    // Critical UI font — swap in as soon as loaded
  preload: true,
});

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-noto-serif",
  display: "swap",    // Don't block render
  preload: false,     // Secondary serif — not critical
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://emanthread.com";

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Eman Thread",
  "url": siteUrl,
  "image": `${siteUrl}/logo-circle.png`,
  "potentialAction": {
    "@type": "SearchAction",
    "target": `${siteUrl}/shop?q={search_term_string}`,
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
  // Cache store config for 1 hour — GA/Pixel IDs don't change at runtime
  const getCachedStoreConfig = unstable_cache(
    () => getStoreConfig(),
    ["root-layout-store-config"],
    { revalidate: 3600 }
  );
  const config = await getCachedStoreConfig();
  const { googleAnalyticsId, facebookPixelId } = config;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${cormorant.variable} ${inter.variable} ${notoSerif.variable} font-sans antialiased`}
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
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
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

        {/* Google Analytics (gtag.js) — only loads if an ID is configured */}
        {googleAnalyticsId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAnalyticsId}');
              `}
            </Script>
          </>
        )}

        {/* Facebook Pixel — only loads if an ID is configured */}
        {facebookPixelId && (
          <Script id="facebook-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${facebookPixelId}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}
      </body>
    </html>
  );
}
