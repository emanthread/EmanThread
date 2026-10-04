import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FlashSaleBanner } from "@/app/components/flash-sale-banner";
import { HeroSection } from "@/components/home/hero-section";
import { MobileDepartmentHome } from '@/components/home/mobile-department-home';
import type { MobileHomepageDepartment } from '@/lib/mobile-homepage';

import { DEFAULT_HERO_SLIDES, getHeroSlides } from "@/lib/db/store-config";
import { getCatalogPageData } from '@/lib/db/catalog';
import { getMobileHomepageConfig } from '@/lib/db/mobile-homepage';
import {
  createDefaultMobileHomepageConfig,
  getVisibleMobileHomepageItems,
  resolveMobileHomepageHref,
  type MobileHomepageConfig,
} from '@/lib/mobile-homepage';

// ── Lazy-load below-the-fold and overlay components ───────────────────────────
// CartDrawer: off-screen overlay — never needed at first paint.
const CartDrawer = dynamic(
  () => import("@/components/cart/lazy-cart-drawer").then((m) => ({ default: m.CartDrawer })),
  { loading: () => null }
);

// The homepage shell changes with every deployment and must never be served
// from an expired full-route cache. Data helpers keep their existing cache
// and invalidation policies.


function HomepageCollectionsFallback() {
  return (
    <div role="status" aria-label="Loading homepage collections" className="min-h-[520px] bg-white px-6 py-10 text-black lg:px-12">
      <div className="h-9 w-64 animate-pulse rounded bg-neutral-200" />
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="aspect-[4/3] animate-pulse bg-neutral-100" />
        ))}
      </div>
    </div>
  );
}

async function HomepageCollections({
  config,
  initialDepartment,
  initialPrimaryPath,
  initialSecondaryPath,
}: {
  config: MobileHomepageConfig;
  initialDepartment: MobileHomepageDepartment;
  initialPrimaryPath: string;
  initialSecondaryPath: string;
}) {
  const [mobilePrimaryResult, mobileSecondaryResult] = await Promise.allSettled([
    getCatalogPageData(initialPrimaryPath, { pageSize: 12, sort: 'trending' }),
    getCatalogPageData(initialSecondaryPath, { pageSize: 12, sort: 'trending' }),
  ]);
  for (const result of [mobilePrimaryResult, mobileSecondaryResult]) {
    if (result.status === 'rejected') {
      console.error('[homepage] Cached data source unavailable; using fallback', result.reason);
    }
  }

  return (
    <MobileDepartmentHome
      config={config}
      initialDepartment={initialDepartment}
      initialPrimaryPath={initialPrimaryPath}
      initialPrimaryProducts={mobilePrimaryResult.status === 'fulfilled'
        ? mobilePrimaryResult.value?.products ?? []
        : []}
      initialSecondaryPath={initialSecondaryPath}
      initialSecondaryProducts={mobileSecondaryResult.status === 'fulfilled'
        ? mobileSecondaryResult.value?.products ?? []
        : []}
    />
  );
}

export async function DepartmentHome({
  department = 'women',
}: { department?: MobileHomepageDepartment }) {
  const [heroSlidesResult, mobileConfigResult] = await Promise.allSettled([
    getHeroSlides(),
    getMobileHomepageConfig(),
  ]);
  const heroSlides = heroSlidesResult.status === 'fulfilled'
    ? heroSlidesResult.value
    : [...DEFAULT_HERO_SLIDES];
  const mobileConfig = mobileConfigResult.status === 'fulfilled'
    ? mobileConfigResult.value
    : createDefaultMobileHomepageConfig();
  for (const result of [heroSlidesResult, mobileConfigResult]) {
    if (result.status === 'rejected') {
      console.error('[homepage] Cached data source unavailable; using fallback', result.reason);
    }
  }

  const firstCategory = getVisibleMobileHomepageItems(
    mobileConfig.departments[department].categoryCards,
  )[0];
  const initialPrimaryPath = firstCategory
    ? resolveMobileHomepageHref(firstCategory.destinationId)
    : `/${department}`;
  const initialSecondaryPath = `/${department}`;

  return (
    <>
      <Header initialHomeDepartment={department} />
      <CartDrawer />
      <FlashSaleBanner />
      <main>
        <HeroSection key={department} initialSlides={heroSlides} initialDepartment={department} />
        <Suspense fallback={<HomepageCollectionsFallback />}>
          <HomepageCollections
            key={department}
            config={mobileConfig}
            initialDepartment={department}
            initialPrimaryPath={initialPrimaryPath}
            initialSecondaryPath={initialSecondaryPath}
          />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
