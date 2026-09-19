import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

import {
  MOBILE_BANNER_COUNT,
  MOBILE_HOMEPAGE_DEPARTMENTS,
  createDefaultMobileHomepageConfig,
  getMobileHomepageDestinations,
  parseMobileHomepageConfig,
  resolveMobileHomepageHref,
  validateMobileHomepageConfig,
} from '../lib/mobile-homepage';

test.describe('mobile department homepage', () => {
  test('provides categories and five valid banners for every department', () => {
    const config = createDefaultMobileHomepageConfig();
    for (const departmentId of MOBILE_HOMEPAGE_DEPARTMENTS) {
      const department = config.departments[departmentId];
      const destinations = new Set(
        getMobileHomepageDestinations(departmentId).map(({ id }) => id),
      );
      expect(department.categoryCards.length).toBeGreaterThan(0);
      expect(department.banners).toHaveLength(MOBILE_BANNER_COUNT);
      expect([...department.categoryCards, ...department.banners].every(
        (item) =>
          Boolean(item.mobileImage) &&
          Boolean(item.desktopImage) &&
          destinations.has(item.destinationId) &&
          resolveMobileHomepageHref(item.destinationId) !== '/',
      )).toBe(true);
    }
    expect(validateMobileHomepageConfig(config).ok).toBe(true);
  });
  test('rejects unsafe images and links outside a department', () => {
    const config = createDefaultMobileHomepageConfig();
    config.departments.women.banners[0].desktopImage = 'javascript:alert(1)';
    expect(validateMobileHomepageConfig(config).ok).toBe(false);

    const wrongLink = createDefaultMobileHomepageConfig();
    wrongLink.departments.women.categoryCards[0].destinationId = 'men';
    expect(validateMobileHomepageConfig(wrongLink).ok).toBe(false);
  });

  test('migrates legacy single-image records into both responsive slots', () => {
    const legacy = createDefaultMobileHomepageConfig() as unknown as {
      departments: Record<string, { categoryCards: Array<Record<string, unknown>> }>;
    };
    const card = legacy.departments.women.categoryCards[0];
    const legacyImage = String(card.mobileImage);
    card.image = legacyImage;
    delete card.mobileImage;
    delete card.desktopImage;

    const parsed = parseMobileHomepageConfig(legacy);
    expect(parsed.departments.women.categoryCards[0].mobileImage).toBe(legacyImage);
    expect(parsed.departments.women.categoryCards[0].desktopImage).toBe(legacyImage);
  });

  test('keeps separate admin uploads and renders the homepage on desktop', () => {
    const adminSource = readFileSync(
      'app/admin/(dashboard)/mobile-homepage/page.tsx',
      'utf8',
    );
    const homepageSource = readFileSync(
      'components/home/mobile-department-home.tsx',
      'utf8',
    );

    expect(adminSource).toContain("label='Mobile image'");
    expect(adminSource).toContain("label='Desktop/Web image'");
    expect(homepageSource).toContain("data-home-department={activeDepartment}");
    expect(homepageSource).not.toContain("text-black lg:hidden");
  });

  test('keeps mobile product cards focused on a compact wishlist action', () => {
    const productCardSource = readFileSync(
      'components/product/product-card.tsx',
      'utf8',
    );

    expect(productCardSource).toContain(
      'hidden max-w-none px-2 text-xs font-medium uppercase tracking-wider sm:inline-flex',
    );
    expect(productCardSource).toContain(
      'hidden gap-2 p-4 opacity-95 transition-all duration-300 sm:flex',
    );
    expect(productCardSource).toContain(
      'right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full',
    );
    expect(productCardSource).toContain('h-3.5 w-3.5 sm:h-4 sm:w-4');
  });
});
