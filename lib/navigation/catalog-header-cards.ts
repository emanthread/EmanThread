import {
  catalogMenu,
  type MenuDepartment,
  type MenuSection,
  type MenuVisualCard,
} from "@/lib/navigation/catalog-menu";

export const CATALOG_HEADER_CARDS_KEY = "catalog_header_cards_v1";
export const MAX_HEADER_CARDS_PER_CONTEXT = 3;

export type CatalogHeaderCard = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  image: string;
  destinationId: string;
  order: number;
  visible: boolean;
};

export type CatalogHeaderCardConfig = {
  version: 1;
  contexts: Record<string, CatalogHeaderCard[]>;
};

export type CatalogHeaderCardContext = {
  id: string;
  label: string;
  departmentId: MenuDepartment["id"];
  sectionId: string | null;
  cards: CatalogHeaderCard[];
  defaultCards: CatalogHeaderCard[];
  customized: boolean;
  inheritFromContextId: string | null;
};

export type CatalogHeaderDestination = {
  id: string;
  label: string;
  href: string;
  departmentId: MenuDepartment["id"];
};

export const EMPTY_CATALOG_HEADER_CARD_CONFIG: CatalogHeaderCardConfig = {
  version: 1,
  contexts: {},
};

export function departmentCardContextId(departmentId: string) {
  return `department:${departmentId}`;
}

export function sectionCardContextId(sectionId: string) {
  return `section:${sectionId}`;
}

export function getCatalogHeaderDestinations(): CatalogHeaderDestination[] {
  const destinations: CatalogHeaderDestination[] = [];

  for (const department of catalogMenu) {
    destinations.push({
      id: department.id,
      label: department.label,
      href: `/${department.id}`,
      departmentId: department.id,
    });

    for (const section of department.sections) {
      if (section.href) {
        destinations.push({
          id: section.id,
          label: `${department.label} / ${section.label}`,
          href: section.href,
          departmentId: department.id,
        });
      }

      for (const group of section.groups) {
        for (const item of group.items) {
          if (!item.href || destinations.some(({ id }) => id === item.id)) continue;
          destinations.push({
            id: item.id,
            label: `${department.label} / ${section.label} / ${item.label}`,
            href: item.href,
            departmentId: department.id,
          });
        }
      }
    }
  }

  return destinations;
}

const destinations = getCatalogHeaderDestinations();
const destinationsById = new Map(destinations.map((destination) => [destination.id, destination]));

function destinationIdForCard(card: MenuVisualCard) {
  return destinations.find((destination) => destination.href === card.href)?.id ?? "";
}

function defaultCard(card: MenuVisualCard, index: number): CatalogHeaderCard {
  return {
    id: card.id,
    title: card.label,
    subtitle: "",
    cta: "Shop now",
    image: card.image ?? "",
    destinationId: destinationIdForCard(card),
    order: index + 1,
    visible: card.visibility === "visible",
  };
}

function sourceCards(department: MenuDepartment, section?: MenuSection) {
  if (section?.visualCards.length) return section.visualCards;
  return department.visualCards;
}

export function getCatalogHeaderCardContexts(
  config: CatalogHeaderCardConfig = EMPTY_CATALOG_HEADER_CARD_CONFIG,
): CatalogHeaderCardContext[] {
  return catalogMenu.flatMap((department) => {
    const departmentContextId = departmentCardContextId(department.id);
    const departmentDefaults = sourceCards(department).map(defaultCard);
    const departmentContext: CatalogHeaderCardContext = {
      id: departmentContextId,
      label: `${department.label} — default cards`,
      departmentId: department.id,
      sectionId: null,
      cards: config.contexts[departmentContextId] ?? departmentDefaults,
      defaultCards: departmentDefaults,
      customized: Object.hasOwn(config.contexts, departmentContextId),
      inheritFromContextId: null,
    };

    return [
      departmentContext,
      ...department.sections.map((section) => {
        const contextId = sectionCardContextId(section.id);
        const sectionDefaults = sourceCards(department, section).map((card, index) => ({
          ...defaultCard(card, index),
          id: `${section.id}.slot.${index + 1}`,
        }));
        const inheritsDepartment = section.visualCards.length === 0;
        return {
          id: contextId,
          label: `${department.label} — ${section.label}`,
          departmentId: department.id,
          sectionId: section.id,
          cards: config.contexts[contextId] ??
            (inheritsDepartment
              ? config.contexts[departmentContextId] ?? sectionDefaults
              : sectionDefaults),
          defaultCards: sectionDefaults,
          customized: Object.hasOwn(config.contexts, contextId),
          inheritFromContextId: inheritsDepartment ? departmentContextId : null,
        };
      }),
    ];
  });
}

export function getResolvedCatalogHeaderCards(
  department: MenuDepartment,
  section: MenuSection,
  config: CatalogHeaderCardConfig,
): CatalogHeaderCard[] {
  const sectionOverride = config.contexts[sectionCardContextId(section.id)];
  const departmentOverride = config.contexts[departmentCardContextId(department.id)];
  const cards =
    sectionOverride ??
    (section.visualCards.length > 0
      ? section.visualCards.map(defaultCard)
      : departmentOverride ?? department.visualCards.map(defaultCard));

  return [...cards]
    .filter((card) => card.visible && destinationsById.has(card.destinationId))
    .sort((a, b) => a.order - b.order)
    .slice(0, MAX_HEADER_CARDS_PER_CONTEXT);
}

export function resolveCatalogHeaderCardHref(destinationId: string) {
  return destinationsById.get(destinationId)?.href ?? null;
}

export function isAllowedCatalogHeaderImage(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      ["res.cloudinary.com", "images.unsplash.com"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

export function parseCatalogHeaderCardConfig(value: unknown): CatalogHeaderCardConfig {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  const rawContexts =
    record?.contexts && typeof record.contexts === "object" && !Array.isArray(record.contexts)
      ? (record.contexts as Record<string, unknown>)
      : {};
  const validContextIds = new Set(getCatalogHeaderCardContexts().map((context) => context.id));
  const validDestinationIds = new Set(destinations.map((destination) => destination.id));
  const contexts: Record<string, CatalogHeaderCard[]> = {};

  for (const [contextId, rawCards] of Object.entries(rawContexts)) {
    if (!validContextIds.has(contextId) || !Array.isArray(rawCards)) continue;
    const cards: CatalogHeaderCard[] = [];

    for (const [index, rawCard] of rawCards.slice(0, MAX_HEADER_CARDS_PER_CONTEXT).entries()) {
      if (!rawCard || typeof rawCard !== "object" || Array.isArray(rawCard)) continue;
      const card = rawCard as Record<string, unknown>;
      const id = typeof card.id === "string" ? card.id.trim().slice(0, 160) : "";
      const title = typeof card.title === "string" ? card.title.trim().slice(0, 80) : "";
      const subtitle = typeof card.subtitle === "string" ? card.subtitle.trim().slice(0, 120) : "";
      const cta = typeof card.cta === "string" ? card.cta.trim().slice(0, 40) : "";
      const image = typeof card.image === "string" ? card.image.trim().slice(0, 1000) : "";
      const destinationId =
        typeof card.destinationId === "string" ? card.destinationId : "";
      if (!id || !title || !isAllowedCatalogHeaderImage(image) || !validDestinationIds.has(destinationId)) {
        continue;
      }
      cards.push({
        id,
        title,
        subtitle,
        cta,
        image,
        destinationId,
        order: index + 1,
        visible: card.visible !== false,
      });
    }
    contexts[contextId] = cards;
  }

  return { version: 1, contexts };
}
