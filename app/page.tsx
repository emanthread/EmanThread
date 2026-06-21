import dynamic from "next/dynamic";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FlashSaleBanner } from "@/app/components/flash-sale-banner";
import { HeroSection } from "@/components/home/hero-section";
import { LuxuryHighlightsSection } from "@/components/home/luxury-highlights-section";
import { CategoriesSection } from "@/components/home/categories-section";
import { getAllProducts, getFeaturedCategories } from "@/lib/db-queries";
import { getHeroSlides } from "@/lib/db/store-config";

// ── Lazy-load below-the-fold and overlay components ───────────────────────────
// CartDrawer: off-screen overlay — never needed at first paint.
// TrendingSection, PromoSection, NewArrivalsSection, TestimonialsSection:
//   all below the fold — deferring them shrinks the initial JS bundle.
const CartDrawer = dynamic(
  () => import("@/components/cart/cart-drawer").then((m) => ({ default: m.CartDrawer })),
  { ssr: false, loading: () => null }
);

const TrendingSection = dynamic(
  () => import("@/components/home/trending-section").then((m) => ({ default: m.TrendingSection })),
  { ssr: true, loading: () => <div className="py-20 lg:py-28 bg-secondary/50" /> }
);

const PromoSection = dynamic(
  () => import("@/components/home/promo-section").then((m) => ({ default: m.PromoSection })),
  { ssr: true, loading: () => <div className="py-20" /> }
);

const NewArrivalsSection = dynamic(
  () => import("@/components/home/new-arrivals-section").then((m) => ({ default: m.NewArrivalsSection })),
  { ssr: true, loading: () => <div className="py-20 lg:py-28" /> }
);

const TestimonialsSection = dynamic(
  () => import("@/components/home/testimonials-section").then((m) => ({ default: m.TestimonialsSection })),
  { ssr: true, loading: () => <div className="py-20" /> }
);

export const revalidate = 300; // Cache the home page for 5 minutes

export default async function HomePage() {
  // All three queries are now cached — near-zero latency after the first call
  const [products, featuredCategories, heroSlides] = await Promise.all([
    getAllProducts(20),
    getFeaturedCategories(),
    getHeroSlides(),
  ]);

  return (
    <>
      <Header />
      {/* CartDrawer lazy-loaded: off-screen overlay, not needed at first paint */}
      <CartDrawer />
      <FlashSaleBanner />
      <main>
        {/* HeroSection receives pre-fetched slides — no client waterfall fetch */}
        <HeroSection initialSlides={heroSlides} />
        {/* LuxuryHighlightsSection is now a pure RSC — zero hydration cost */}
        <LuxuryHighlightsSection />
        {/* CategoriesSection is now a pure RSC — zero hydration cost */}
        <CategoriesSection categories={featuredCategories} />
        {/* Below-the-fold sections are lazy-loaded to shrink the initial JS bundle */}
        <TrendingSection products={products} />
        <PromoSection />
        <NewArrivalsSection products={products} />
        <TestimonialsSection />
      </main>
      <Footer />
    </>
  );
}
