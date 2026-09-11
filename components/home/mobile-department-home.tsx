'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ProductCard } from '@/components/product/product-card';
import type { Product } from '@/lib/data';
import {
  MOBILE_HOMEPAGE_EVENT,
  getVisibleMobileHomepageItems,
  isMobileHomepageDepartment,
  resolveMobileHomepageHref,
  type MobileHomepageBanner,
  type MobileHomepageConfig,
  type MobileHomepageDepartment,
} from '@/lib/mobile-homepage';

type MobileDepartmentHomeProps = {
  config: MobileHomepageConfig;
  initialPrimaryPath: string;
  initialPrimaryProducts: Product[];
  initialSecondaryPath: string;
  initialSecondaryProducts: Product[];
};

function ScrollRail({ children, itemCount, className, label }: {
  children: ReactNode;
  itemCount: number;
  className: string;
  label: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [activeDot, setActiveDot] = useState(0);
  const dotCount = Math.min(4, Math.max(1, Math.ceil(itemCount / 2)));

  return (
    <>
      <div
        ref={railRef}
        role='group'
        aria-label={label}
        className={`scrollbar-none flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain ${className}`}
        onScroll={() => {
          const rail = railRef.current;
          if (!rail || rail.scrollWidth <= rail.clientWidth) return setActiveDot(0);
          const progress = rail.scrollLeft / (rail.scrollWidth - rail.clientWidth);
          setActiveDot(Math.round(progress * (dotCount - 1)));
        }}
      >
        {children}
      </div>
      {dotCount > 1 ? (
        <div className='flex justify-center gap-1.5 py-5' aria-hidden='true'>
          {Array.from({ length: dotCount }, (_, index) => (
            <span key={index} className={`h-2.5 w-2.5 rounded-full ${
              index === activeDot ? 'bg-red-700' : 'bg-neutral-400'
            }`} />
          ))}
        </div>
      ) : null}
    </>
  );
}

function EditorialBanner({ banner, eager = false }: {
  banner: MobileHomepageBanner | undefined;
  eager?: boolean;
}) {
  if (!banner?.visible) return null;
  return (
    <Link
      href={resolveMobileHomepageHref(banner.destinationId)}
      className='group relative block aspect-[4/5] overflow-hidden bg-neutral-200'
      aria-label={`${banner.cta}: ${banner.title}`}
    >
      <Image
        src={banner.image}
        alt={banner.title}
        fill
        priority={eager}
        sizes='100vw'
        className='object-cover transition-transform duration-700 group-active:scale-[1.02]'
      />
      <span className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent' />
      <span className='absolute bottom-0 left-0 p-6 text-white'>
        {banner.subtitle ? (
          <span className='mb-2 block text-sm font-medium uppercase tracking-[0.16em]'>
            {banner.subtitle}
          </span>
        ) : null}
        <span className='block text-3xl font-semibold uppercase leading-none'>{banner.title}</span>
        <span className='mt-5 inline-block border-b border-white pb-1 text-sm font-semibold uppercase'>
          {banner.cta}
        </span>
      </span>
    </Link>
  );
}

function ProductRail({ products, loading, label }: {
  products: Product[];
  loading: boolean;
  label: string;
}) {
  if (loading) {
    return <div className='mx-4 h-[390px] animate-pulse bg-neutral-100' aria-label={`Loading ${label}`} />;
  }
  if (!products.length) {
    return <p className='px-6 py-12 text-center text-sm text-neutral-500'>Products are coming soon.</p>;
  }
  return (
    <ScrollRail itemCount={products.length} label={label} className='gap-1 px-2'>
      {products.map((product) => (
        <div key={product.id} className='w-[44vw] max-w-[205px] shrink-0 snap-start'>
          <ProductCard product={product} variant='mobileEditorial' />
        </div>
      ))}
    </ScrollRail>
  );
}

async function fetchProducts(path: string): Promise<Product[]> {
  const params = new URLSearchParams({ catalogPath: path, limit: '12', sort: 'trending' });
  const response = await fetch(`/api/catalog/products?${params}`, { cache: 'no-store' });
  if (!response.ok) return [];
  const payload = (await response.json()) as { products?: Product[] };
  return payload.products ?? [];
}

export function MobileDepartmentHome({
  config,
  initialPrimaryPath,
  initialPrimaryProducts,
  initialSecondaryPath,
  initialSecondaryProducts,
}: MobileDepartmentHomeProps) {
  const [activeDepartment, setActiveDepartment] =
    useState<MobileHomepageDepartment>('women');
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [productsByPath, setProductsByPath] = useState<Record<string, Product[]>>({
    [initialPrimaryPath]: initialPrimaryProducts,
    [initialSecondaryPath]: initialSecondaryProducts,
  });
  const [loadingPaths, setLoadingPaths] = useState<string[]>([]);

  const department = config.departments[activeDepartment];
  const categoryCards = useMemo(
    () => getVisibleMobileHomepageItems(department.categoryCards),
    [department.categoryCards],
  );
  const activeCategory =
    categoryCards.find(({ id }) => id === activeCategoryId) ?? categoryCards[0];
  const primaryPath = activeCategory
    ? resolveMobileHomepageHref(activeCategory.destinationId)
    : `/${activeDepartment}`;
  const secondaryPath = `/${activeDepartment}`;

  useEffect(() => {
    const changeDepartment = (event: Event) => {
      const next = (event as CustomEvent<{ department?: unknown }>).detail?.department;
      if (!isMobileHomepageDepartment(next)) return;
      const first = getVisibleMobileHomepageItems(config.departments[next].categoryCards)[0];
      setActiveDepartment(next);
      setActiveCategoryId(first?.id ?? '');
    };
    window.addEventListener(MOBILE_HOMEPAGE_EVENT, changeDepartment);
    return () => window.removeEventListener(MOBILE_HOMEPAGE_EVENT, changeDepartment);
  }, [config]);

  useEffect(() => {
    const missingPaths = [...new Set([primaryPath, secondaryPath])].filter(
      (path) => !(path in productsByPath),
    );
    if (!missingPaths.length) return;
    let active = true;
    setLoadingPaths((current) => [...new Set([...current, ...missingPaths])]);
    void Promise.all(missingPaths.map(async (path) => [path, await fetchProducts(path)] as const))
      .then((entries) => {
        if (active) setProductsByPath((current) => ({ ...current, ...Object.fromEntries(entries) }));
      })
      .finally(() => {
        if (active) setLoadingPaths((current) => current.filter((path) => !missingPaths.includes(path)));
      });
    return () => { active = false; };
  }, [primaryPath, productsByPath, secondaryPath]);

  const banners = department.banners;
  const departmentProducts = productsByPath[secondaryPath] ?? [];
  const categoryProducts = productsByPath[primaryPath] ?? [];
  const primaryProducts = categoryProducts.length ? categoryProducts : departmentProducts;
  const secondaryProducts = departmentProducts.length ? departmentProducts : primaryProducts;

  return (
    <div className='bg-white text-black lg:hidden' data-mobile-department={activeDepartment}>
      <section aria-labelledby='mobile-shop-by-category'>
        <h2 id='mobile-shop-by-category' className='px-6 py-6 text-xl font-semibold tracking-tight'>
          SHOP BY CATEGORY
        </h2>
        <ScrollRail itemCount={categoryCards.length} label='Shop by category' className='gap-1 px-1'>
          {categoryCards.map((card) => (
            <Link
              key={card.id}
              href={resolveMobileHomepageHref(card.destinationId)}
              className='w-[44vw] max-w-[210px] shrink-0 snap-start'
            >
              <span className='relative block aspect-[4/5] overflow-hidden bg-neutral-100'>
                <Image src={card.image} alt={card.title} fill sizes='44vw' className='object-cover' />
              </span>
              <span className='block truncate px-2 py-4 text-center text-sm font-medium uppercase'>
                {card.title}
              </span>
            </Link>
          ))}
        </ScrollRail>
      </section>

      <EditorialBanner banner={banners[0]} eager />

      <section className='bg-white py-6' aria-labelledby='mobile-trending'>
        <div className='flex items-end gap-5 overflow-x-auto px-6 pb-5'>
          <h2 id='mobile-trending' className='shrink-0 text-xl font-semibold'>TRENDING</h2>
          {categoryCards.slice(0, 3).map((card) => (
            <button
              key={card.id}
              type='button'
              onClick={() => setActiveCategoryId(card.id)}
              aria-pressed={activeCategory?.id === card.id}
              className={`shrink-0 border-b-2 pb-1 text-sm ${
                activeCategory?.id === card.id ? 'border-black font-medium' : 'border-transparent'
              }`}
            >
              {card.title}
            </button>
          ))}
        </div>
        <ProductRail
          products={primaryProducts}
          loading={loadingPaths.includes(primaryPath)}
          label={`${activeDepartment} trending products`}
        />
        <div className='pt-1 text-center'>
          <Link href={primaryPath} className='inline-block border-b-2 border-black pb-1 text-sm font-medium'>
            SEE ALL
          </Link>
        </div>
      </section>

      <EditorialBanner banner={banners[1]} />
      <EditorialBanner banner={banners[2]} />

      <section className='bg-white py-7' aria-labelledby='mobile-trending-fits'>
        <h2 id='mobile-trending-fits' className='px-6 pb-6 text-xl font-semibold'>
          TRENDING FITS
        </h2>
        <ProductRail
          products={secondaryProducts}
          loading={loadingPaths.includes(secondaryPath)}
          label={`${activeDepartment} trending fits`}
        />
        <div className='pt-1 text-center'>
          <Link href={secondaryPath} className='inline-block border-b-2 border-black pb-1 text-sm font-medium'>
            SEE ALL
          </Link>
        </div>
      </section>

      <EditorialBanner banner={banners[3]} />
      <EditorialBanner banner={banners[4]} />
    </div>
  );
}
