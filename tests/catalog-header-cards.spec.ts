import { expect, test } from "@playwright/test";

import { catalogMenu } from "../lib/navigation/catalog-menu";
import {
  EMPTY_CATALOG_HEADER_CARD_CONFIG,
  getCatalogHeaderCardContexts,
  getCatalogHeaderDestinations,
  getResolvedCatalogHeaderCards,
  parseCatalogHeaderCardConfig,
  resolveCatalogHeaderCardHref,
  sectionCardContextId,
} from "../lib/navigation/catalog-header-cards";

test.describe("admin-managed catalog header cards", () => {
  test("derives editable presentation contexts from the protected catalog structure", () => {
    const contexts = getCatalogHeaderCardContexts();
    const sectionCount = catalogMenu.reduce(
      (total, department) => total + department.sections.length,
      0,
    );

    expect(contexts).toHaveLength(catalogMenu.length + sectionCount);
    expect(contexts.every((context) => context.cards.length <= 3)).toBe(true);
    expect(
      contexts.find(({ id }) => id === "section:women.ready-to-wear")?.cards.map(({ title }) => title),
    ).toEqual(["3 PIECE", "KURTA", "SIGNATURE"]);
  });

  test("allows destinations only from existing catalog nodes", () => {
    const destinations = getCatalogHeaderDestinations();
    const ids = new Set(destinations.map(({ id }) => id));

    expect(ids.size).toBe(destinations.length);
    expect(resolveCatalogHeaderCardHref("women.ready-to-wear.3-piece")).toBe(
      "/women/ready-to-wear/3-piece",
    );
    expect(resolveCatalogHeaderCardHref("invented-node")).toBeNull();
  });

  test("applies valid presentation overrides while rejecting unsafe card data", () => {
    const contextId = sectionCardContextId("women.ready-to-wear");
    const config = parseCatalogHeaderCardConfig({
      contexts: {
        [contextId]: [
          {
            id: "safe-card",
            title: "KURTA EDIT",
            subtitle: "Summer arrivals",
            cta: "Discover",
            image: "/placeholder.jpg",
            destinationId: "women.ready-to-wear.kurta",
            visible: true,
          },
          {
            id: "unsafe-card",
            title: "Unsafe",
            image: "javascript:alert(1)",
            destinationId: "invented-node",
          },
        ],
        "section:invented": [],
      },
    });
    const department = catalogMenu.find(({ id }) => id === "women")!;
    const section = department.sections.find(({ id }) => id === "women.ready-to-wear")!;
    const cards = getResolvedCatalogHeaderCards(department, section, config);

    expect(Object.keys(config.contexts)).toEqual([contextId]);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ title: "KURTA EDIT", order: 1 });
    expect(EMPTY_CATALOG_HEADER_CARD_CONFIG.contexts).toEqual({});
  });
});
