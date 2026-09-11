import 'server-only';

import { unstable_cache } from 'next/cache';

import { prisma } from '@/lib/db';
import {
  MOBILE_HOMEPAGE_CONFIG_KEY,
  createDefaultMobileHomepageConfig,
  parseMobileHomepageConfig,
  type MobileHomepageConfig,
} from '@/lib/mobile-homepage';

async function readMobileHomepageConfig(): Promise<MobileHomepageConfig> {
  try {
    const row = await prisma.storeConfig.findUnique({
      where: { key: MOBILE_HOMEPAGE_CONFIG_KEY },
    });
    if (!row) return createDefaultMobileHomepageConfig();
    return parseMobileHomepageConfig(JSON.parse(row.value));
  } catch {
    return createDefaultMobileHomepageConfig();
  }
}

export const getMobileHomepageConfig = unstable_cache(
  readMobileHomepageConfig,
  ['mobile-homepage'],
  { revalidate: 300, tags: ['mobile-homepage'] },
);
