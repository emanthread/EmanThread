import dynamic from "next/dynamic";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FlashSaleBanner } from "@/app/components/flash-sale-banner";
import { HeroSection } from "@/components/home/hero-section";
import { MobileDepartmentHome } from '@/components/home/mobile-department-home';

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
const CartDrawer = dynamic(
  () => import("@/components/cart/lazy-cart-drawer").then((m) => ({ default: m.CartDrawer })),
  { loading: () => null }
);

export const revalidate = 300; // Cache the home page for 5 minutes

export default async function HomePage() {
  // Homepage content queries are cached for fast repeat visits.
  const [heroSlidesResult, mobileConfigResult] =
    await Promise.allSettled([
      getHeroSlides(),
      getMobileHomepageConfig(),
    ]);
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
  for (const result of [
    heroSlidesResult,
    mobileConfigResult,
    mobilePrimaryResult,
    mobileSecondaryResult,
  ]) {
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
        <HeroSection initialSlides={heroSlides} initialDepartment='women' />

        <MobileDepartmentHome
          config={mobileConfig}
          initialPrimaryPath={initialPrimaryPath}
          initialPrimaryProducts={mobilePrimaryProducts}
          initialSecondaryPath={initialSecondaryPath}
          initialSecondaryProducts={mobileSecondaryProducts}
        />

      </main>
      <Footer />
    </>
  );
}
