import {
  getCatalogHeaderDestinations,
  isAllowedCatalogHeaderImage,
  type CatalogHeaderDestination,
} from '@/lib/navigation/catalog-header-cards';
import { catalogMenu } from '@/lib/navigation/catalog-menu';

export const MOBILE_HOMEPAGE_CONFIG_KEY = 'mobile_homepage_v1';
export const MOBILE_HOMEPAGE_DEPARTMENTS = [
  'women',
  'men',
  'teens',
  'fragrance-beauty',
] as const;
export const MAX_MOBILE_CATEGORY_CARDS = 8;
export const MOBILE_BANNER_COUNT = 5;

export type MobileHomepageDepartment =
  (typeof MOBILE_HOMEPAGE_DEPARTMENTS)[number];

export type MobileHomepageCard = {
  id: string;
  title: string;
  mobileImage: string;
  desktopImage: string;
  destinationId: string;
  order: number;
  visible: boolean;
};

export type MobileHomepageBanner = MobileHomepageCard & {
  subtitle: string;
  cta: string;
};

export type MobileHomepageDepartmentConfig = {
  categoryCards: MobileHomepageCard[];
  banners: MobileHomepageBanner[];
};

export type MobileHomepageConfig = {
  version: 1;
  departments: Record<
    MobileHomepageDepartment,
    MobileHomepageDepartmentConfig
  >;
};

const CATEGORY_IMAGES: Record<MobileHomepageDepartment, string[]> = {
  women: [
    '/images/banners/women.png',
    '/images/fabrics/hero_fabric_summer_1780065728421.png',
    '/images/fabrics/cat_cotton_1776582727723.png',
    '/images/fabrics/promo_1776582682565.png',
    '/images/fabrics/hero_banner_1_1776582592087.png',
  ],
  men: [
    '/images/banners/men.png',
    '/images/fabrics/hero_fabric_boski_1780066040016.png',
    '/images/fabrics/hero_fabric_wash_wear_1780066058724.png',
    '/images/fabrics/hero_boski_1776582616605.png',
    '/images/fabrics/hero_wash_1776582631696.png',
  ],
  teens: [
    '/images/banners/teens.png',
    '/images/fabrics/hero_fabric_summer_1780065728421.png',
    '/images/fabrics/cat_wool_1776583171222.png',
    '/images/fabrics/cat_cotton_1776582727723.png',
  ],
  'fragrance-beauty': [
    '/images/banners/fragrance-beauty.png',
    '/images/fabrics/hero_boski_1776582616605.png',
    '/images/fabrics/promo_1776582682565.png',
    '/images/fabrics/hero_banner_1_1776582592087.png',
  ],
};

const BANNER_IMAGES = [
  '/images/fabrics/hero_fabric_summer_1780065728421.png',
  '/images/fabrics/promo_1776582682565.png',
  '/images/fabrics/hero_banner_1_1776582592087.png',
  '/images/fabrics/hero_fabric_boski_1780066040016.png',
  '/images/fabrics/hero_fabric_wash_wear_1780066058724.png',
] as const;

export const MOBILE_HOMEPAGE_EVENT = 'eman-thread:home-department';

function isDepartment(value: unknown): value is MobileHomepageDepartment {
  return (
    typeof value === 'string' &&
    MOBILE_HOMEPAGE_DEPARTMENTS.includes(value as MobileHomepageDepartment)
  );
}

function departmentMenu(departmentId: MobileHomepageDepartment) {
  return catalogMenu.find(({ id }) => id === departmentId);
}

function defaultDepartmentConfig(
  departmentId: MobileHomepageDepartment,
): MobileHomepageDepartmentConfig {
  const sections = departmentMenu(departmentId)?.sections ?? [];
  const images = CATEGORY_IMAGES[departmentId];
  const categoryCards: MobileHomepageCard[] = sections.map((section, index) => ({
    id: `mobile-category-${section.id}`,
    title: section.label,
    mobileImage: images[index % images.length],
    desktopImage: images[(index + 1) % images.length],
    destinationId: section.id,
    order: index + 1,
    visible: true,
  }));
  categoryCards.push(
    {
      id: `mobile-category-${departmentId}-summer`,
      title: 'SUMMER COLLECTION',
      mobileImage: '/images/fabrics/hero_fabric_summer_1780065728421.png',
      desktopImage: '/images/fabrics/cat_cotton_1776582727723.png',
      destinationId: `${departmentId}.season.summer`,
      order: categoryCards.length + 1,
      visible: true,
    },
    {
      id: `mobile-category-${departmentId}-winter`,
      title: 'WINTER COLLECTION',
      mobileImage: '/images/fabrics/cat_wool_1776583171222.png',
      desktopImage: '/images/fabrics/hero_fabric_boski_1780066040016.png',
      destinationId: `${departmentId}.season.winter`,
      order: categoryCards.length + 2,
      visible: true,
    },
  );
  const banners = Array.from({ length: MOBILE_BANNER_COUNT }, (_, index) => {
    const section = sections[index % sections.length];
    return {
      id: `mobile-banner-${departmentId}-${index + 1}`,
      title: section.label,
      subtitle: index === 0 ? 'FEATURED COLLECTION' : 'DISCOVER MORE',
      cta: 'SHOP NOW',
      mobileImage: index === 0
        ? `/images/banners/${departmentId}.png`
        : BANNER_IMAGES[index],
      desktopImage: index === 0
        ? `/images/banners/${departmentId}.png`
        : BANNER_IMAGES[(index + 1) % BANNER_IMAGES.length],
      destinationId: section.id,
      order: index + 1,
      visible: true,
    };
  });
  return { categoryCards, banners };
}

export function createDefaultMobileHomepageConfig(): MobileHomepageConfig {
  return {
    version: 1,
    departments: Object.fromEntries(
      MOBILE_HOMEPAGE_DEPARTMENTS.map((id) => [id, defaultDepartmentConfig(id)]),
    ) as MobileHomepageConfig['departments'],
  };
}

export function getMobileHomepageDestinations(
  departmentId?: MobileHomepageDepartment,
): CatalogHeaderDestination[] {
  const catalogDestinations = getCatalogHeaderDestinations().filter(
    (destination) => !departmentId || destination.departmentId === departmentId,
  );
  const seasonalDestinations = MOBILE_HOMEPAGE_DEPARTMENTS
    .filter((id) => !departmentId || id === departmentId)
    .flatMap((id) => [
      {
        id: `${id}.season.summer`,
        label: `${getMobileHomepageDepartmentLabel(id)} / SUMMER COLLECTION`,
        href: `/${id}?season=Summer`,
        departmentId: id,
      },
      {
        id: `${id}.season.winter`,
        label: `${getMobileHomepageDepartmentLabel(id)} / WINTER COLLECTION`,
        href: `/${id}?season=Winter`,
        departmentId: id,
      },
    ]);
  return [...catalogDestinations, ...seasonalDestinations];
}

export function resolveMobileHomepageHref(destinationId: string) {
  return getMobileHomepageDestinations().find(({ id }) => id === destinationId)?.href ?? '/';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function parseCard(
  value: unknown,
  departmentId: MobileHomepageDepartment,
  order: number,
): MobileHomepageCard | null {
  const card = asRecord(value);
  if (!card) return null;
  const validDestinations = new Set(
    getMobileHomepageDestinations(departmentId).map(({ id }) => id),
  );
  const id = cleanText(card.id, 160);
  const title = cleanText(card.title, 80);
  const legacyImage = cleanText(card.image, 1000);
  const mobileImage = cleanText(card.mobileImage, 1000) || legacyImage;
  const desktopImage =
    cleanText(card.desktopImage, 1000) || legacyImage || mobileImage;
  const destinationId = cleanText(card.destinationId, 200);
  if (
    !id ||
    !title ||
    !isAllowedCatalogHeaderImage(mobileImage) ||
    !isAllowedCatalogHeaderImage(desktopImage) ||
    !validDestinations.has(destinationId)
  ) {
    return null;
  }
  return {
    id,
    title,
    mobileImage,
    desktopImage,
    destinationId,
    order,
    visible: card.visible !== false,
  };
}

function parseBanner(
  value: unknown,
  departmentId: MobileHomepageDepartment,
  order: number,
): MobileHomepageBanner | null {
  const raw = asRecord(value);
  const card = parseCard(value, departmentId, order);
  if (!raw || !card) return null;
  return {
    ...card,
    subtitle: cleanText(raw.subtitle, 120),
    cta: cleanText(raw.cta, 40) || 'SHOP NOW',
  };
}

export function parseMobileHomepageConfig(value: unknown): MobileHomepageConfig {
  const defaults = createDefaultMobileHomepageConfig();
  const root = asRecord(value);
  const rawDepartments = asRecord(root?.departments);
  if (!rawDepartments) return defaults;

  const departments = Object.fromEntries(
    MOBILE_HOMEPAGE_DEPARTMENTS.map((departmentId) => {
      const fallback = defaults.departments[departmentId];
      const rawDepartment = asRecord(rawDepartments[departmentId]);
      const rawCards = Array.isArray(rawDepartment?.categoryCards)
        ? rawDepartment.categoryCards
        : [];
      const rawBanners = Array.isArray(rawDepartment?.banners)
        ? rawDepartment.banners
        : [];
      const parsedCategoryCards = rawCards
        .slice(0, MAX_MOBILE_CATEGORY_CARDS)
        .map((card, index) => parseCard(card, departmentId, index + 1))
        .filter((card): card is MobileHomepageCard => Boolean(card));
      const categoryCards = parsedCategoryCards.length
        ? [...parsedCategoryCards]
        : [...fallback.categoryCards];
      const seasonalCards = fallback.categoryCards.filter(
        ({ destinationId }) =>
          destinationId === `${departmentId}.season.summer` ||
          destinationId === `${departmentId}.season.winter`,
      );
      for (const seasonalCard of seasonalCards) {
        if (
          categoryCards.length < MAX_MOBILE_CATEGORY_CARDS &&
          !categoryCards.some(({ destinationId }) => destinationId === seasonalCard.destinationId)
        ) {
          categoryCards.push({ ...seasonalCard, order: categoryCards.length + 1 });
        }
      }
      const banners = Array.from({ length: MOBILE_BANNER_COUNT }, (_, index) =>
        parseBanner(rawBanners[index], departmentId, index + 1) ?? fallback.banners[index],
      );
      return [departmentId, {
        categoryCards,
        banners,
      }];
    }),
  ) as MobileHomepageConfig['departments'];

  return { version: 1, departments };
}

export function getVisibleMobileHomepageItems<T extends { order: number; visible: boolean }>(
  items: T[],
) {
  return [...items].filter(({ visible }) => visible).sort((a, b) => a.order - b.order);
}

export function isMobileHomepageDepartment(
  value: unknown,
): value is MobileHomepageDepartment {
  return isDepartment(value);
}

export function getMobileHomepageDepartmentLabel(departmentId: MobileHomepageDepartment) {
  return departmentMenu(departmentId)?.label ?? departmentId;
}

export type MobileHomepageValidation =
  | { ok: true; config: MobileHomepageConfig }
  | { ok: false; error: string };

export function validateMobileHomepageConfig(value: unknown): MobileHomepageValidation {
  const root = asRecord(value);
  const rawDepartments = asRecord(root?.departments);
  if (!rawDepartments) return { ok: false, error: 'Departments are required.' };
  const departments = {} as MobileHomepageConfig['departments'];

  for (const departmentId of MOBILE_HOMEPAGE_DEPARTMENTS) {
    const rawDepartment = asRecord(rawDepartments[departmentId]);
    const rawCards = rawDepartment?.categoryCards;
    const rawBanners = rawDepartment?.banners;
    if (!Array.isArray(rawCards) || rawCards.length < 1 || rawCards.length > MAX_MOBILE_CATEGORY_CARDS) {
      return { ok: false, error: `${departmentId} needs 1-${MAX_MOBILE_CATEGORY_CARDS} category cards.` };
    }
    if (!Array.isArray(rawBanners) || rawBanners.length !== MOBILE_BANNER_COUNT) {
      return { ok: false, error: `${departmentId} needs exactly ${MOBILE_BANNER_COUNT} banners.` };
    }
    const categoryCards = rawCards.map((card, index) => parseCard(card, departmentId, index + 1));
    const banners = rawBanners.map((banner, index) => parseBanner(banner, departmentId, index + 1));
    if (categoryCards.some((card) => !card)) {
      return { ok: false, error: `${departmentId} has an invalid category card or link.` };
    }
    if (!categoryCards.some((card) => card?.visible)) {
      return { ok: false, error: `${departmentId} needs at least one visible category card.` };
    }
    if (banners.some((banner) => !banner)) {
      return { ok: false, error: `${departmentId} has an invalid banner or link.` };
    }
    departments[departmentId] = {
      categoryCards: categoryCards as MobileHomepageCard[],
      banners: banners as MobileHomepageBanner[],
    };
  }

  return { ok: true, config: { version: 1, departments } };
}
