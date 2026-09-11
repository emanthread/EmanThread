import dynamic from "next/dynamic";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FlashSaleBanner } from "@/app/components/flash-sale-banner";
import { HeroSection } from "@/components/home/hero-section";
import { MobileDepartmentHome } from '@/components/home/mobile-department-home';

import { CategoriesSection } from "@/components/home/categories-section";
import { getAllProducts, getFeaturedCategoriesSection } from "@/lib/db-queries";
import { DEFAULT_HERO_SLIDES, getHeroSlides } from "@/lib/db/store-config";
import { getCatalogPageData } from '@/lib/db/catalog';
import { getMobileHomepageConfig } from '@/lib/db/mobile-homepage';
import {
  createDefaultMobileHomepageConfig,
  getVisibleMobileHomepageItems,
  resolveMobileHomepageHref,
} from '@/lib/mobile-homepage';

// ── Lazy-load below-the-fold and overlay components ───────────────────────────
// CartDrawer: off-screen overlay — never needed at first paint.
// TrendingSection, PromoSection, NewArrivalsSection, TestimonialsSection:
//   all below the fold — deferring them shrinks the initial JS bundle.
const CartDrawer = dynamic(
  () => import("@/components/cart/lazy-cart-drawer").then((m) => ({ default: m.CartDrawer })),
  { loading: () => null }
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



export const revalidate = 300; // Cache the home page for 5 minutes

export default async function HomePage() {
  // Homepage content queries are cached for fast repeat visits.
  const [productsResult, featuredCategoriesResult, heroSlidesResult, mobileConfigResult] =
    await Promise.allSettled([
      getAllProducts(20),
      getFeaturedCategoriesSection(),
      getHeroSlides(),
      getMobileHomepageConfig(),
    ]);
  const products = productsResult.status === "fulfilled" ? productsResult.value : [];
  const featuredCategoriesSection =
    featuredCategoriesResult.status === "fulfilled"
      ? featuredCategoriesResult.value
      : { categories: [] };
  const heroSlides =
    heroSlidesResult.status === "fulfilled"
      ? heroSlidesResult.value
      : [...DEFAULT_HERO_SLIDES];
  const mobileConfig =
    mobileConfigResult.status === 'fulfilled'
      ? mobileConfigResult.value
      : createDefaultMobileHomepageConfig();
  const firstWomenCategory = getVisibleMobileHomepageItems(
    mobileConfig.departments.women.categoryCards,
  )[0];
  const initialPrimaryPath = firstWomenCategory
    ? resolveMobileHomepageHref(firstWomenCategory.destinationId)
    : '/women';
  const initialSecondaryPath = '/women';
  const [mobilePrimaryResult, mobileSecondaryResult] = await Promise.allSettled([
    getCatalogPageData(initialPrimaryPath, { pageSize: 12, sort: 'trending' }),
    getCatalogPageData(initialSecondaryPath, { pageSize: 12, sort: 'trending' }),
  ]);
  const mobilePrimaryProducts = mobilePrimaryResult.status === 'fulfilled'
    ? mobilePrimaryResult.value?.products ?? []
    : [];
  const mobileSecondaryProducts = mobileSecondaryResult.status === 'fulfilled'
    ? mobileSecondaryResult.value?.products ?? []
    : [];

  // One unavailable cached section must not turn the entire storefront into a
  // build-time or runtime 500 during a temporary database interruption.
  for (const result of [productsResult, featuredCategoriesResult, heroSlidesResult]) {
    if (result.status === "rejected") {
      console.error(
        "[homepage] Cached data source unavailable; using fallback",
        result.reason
      );
    }
  }

  return (
    <>
      <Header />
      {/* CartDrawer lazy-loaded: off-screen overlay, not needed at first paint */}
      <CartDrawer />
      <FlashSaleBanner />
      <main>
        {/* HeroSection receives pre-fetched slides — no client waterfall fetch */}
        <HeroSection initialSlides={heroSlides} mobileInitialDepartment='women' />

        <MobileDepartmentHome
          config={mobileConfig}
          initialPrimaryPath={initialPrimaryPath}
          initialPrimaryProducts={mobilePrimaryProducts}
          initialSecondaryPath={initialSecondaryPath}
          initialSecondaryProducts={mobileSecondaryProducts}
        />

        {/* CategoriesSection is now a pure RSC — zero hydration cost */}
        <div className='hidden lg:block'>
        <CategoriesSection {...featuredCategoriesSection} />
        {/* Below-the-fold sections are lazy-loaded to shrink the initial JS bundle */}
        <TrendingSection products={products} />
        <PromoSection />
        <NewArrivalsSection products={products} />
        </div>

      </main>
      <Footer />
    </>
  );
}
