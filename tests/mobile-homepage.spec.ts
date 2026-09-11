import { expect, test } from '@playwright/test';

import {
  MOBILE_BANNER_COUNT,
  MOBILE_HOMEPAGE_DEPARTMENTS,
  createDefaultMobileHomepageConfig,
  getMobileHomepageDestinations,
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
        (item) => destinations.has(item.destinationId) && resolveMobileHomepageHref(item.destinationId) !== '/',
      )).toBe(true);
    }
    expect(validateMobileHomepageConfig(config).ok).toBe(true);
  });
});

  test('rejects unsafe images and links outside a department', () => {
    const config = createDefaultMobileHomepageConfig();
    config.departments.women.banners[0].image = 'javascript:alert(1)';
    expect(validateMobileHomepageConfig(config).ok).toBe(false);

    const wrongLink = createDefaultMobileHomepageConfig();
    wrongLink.departments.women.categoryCards[0].destinationId = 'men';
    expect(validateMobileHomepageConfig(wrongLink).ok).toBe(false);
  });
