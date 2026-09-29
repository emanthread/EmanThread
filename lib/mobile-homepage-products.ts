import type { Product } from '@/lib/data';

export type MobileHomepageCatalogTarget = {
  catalogPath: string;
  season?: string;
};

export function getMobileHomepageCatalogTarget(
  href: string,
): MobileHomepageCatalogTarget {
  const url = new URL(href, 'https://emanthread.invalid');
  const season = url.searchParams.get('season')?.trim();
  return {
    catalogPath: url.pathname,
    ...(season ? { season } : {}),
  };
}

export async function fetchMobileHomepageProducts(
  href: string,
  fetcher: typeof fetch = fetch,
): Promise<Product[]> {
  const { catalogPath, season } = getMobileHomepageCatalogTarget(href);
  const params = new URLSearchParams({
    catalogPath,
    limit: '12',
    sort: 'trending',
  });
  if (season) params.set('season', season);

  const response = await fetcher('/api/catalog/products?' + params.toString(), {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Catalog products request failed (' + response.status + ')');
  }
  const payload = (await response.json()) as { products?: Product[] };
  return payload.products ?? [];
}