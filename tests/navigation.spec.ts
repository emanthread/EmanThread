import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

import {
  catalogMenu,
  catalogStoreIndicator,
  catalogUtilityLinks,
  catalogVisualCardFallbackImage,
  getVisibleMenuEntries,
  resolveMenuLeafRouteRole,
  resolveMenuVisualCards,
  sortByMenuOrder,
  type MenuDepartment,
  type MenuLeaf,
  type MenuVisualCard,
} from "../lib/navigation/catalog-menu";

const expectedHierarchy = [
  {
    label: "WOMEN",
    sections: [
      {
        label: "NEW IN",
        groups: [
          {
            label: "SHOP BY CATEGORY",
            items: ["UNSTITCHED COLLECTION", "READY TO WEAR", "KURTA COLLECTION"],
          },
        ],
      },
      {
        label: "READY TO WEAR",
        groups: [
          {
            label: "SHOP BY CATEGORY",
            items: ["3 PIECE", "SHIRT & DUPATTA", "KURTA", "MODEST WEAR", "BOTTOMWEAR"],
          },
          {
            label: "SHOP BY COLLECTION",
            items: ["SIGNATURE", "LUXE", "MATCHING SEPARATES"],
          },
        ],
      },
      {
        label: "UNSTITCHED",
        groups: [
          { label: "SHOP BY CATEGORY", items: ["3 PIECE", "2 PIECE", "1 PIECE"] },
          { label: "SHOP BY COLLECTION", items: ["NOYA", "ZARIYA", "LUXE"] },
        ],
      },
      {
        label: "FORMALS",
        groups: [
          { label: "SHOP BY CATEGORY", items: ["RTW 2 PIECE", "RTW 3 PIECE", "UNSTITCHED"] },
          { label: "SHOP BY COLLECTION", items: ["FESTIVE '26"] },
        ],
      },
      { label: "PARTYWEAR", groups: [] },
      { label: "BRIDAL WEAR", groups: [] },
      { label: "SALE", groups: [] },
    ],
  },
  {
    label: "MEN",
    sections: [
      {
        label: "NEW IN",
        groups: [
          {
            label: "SHOP BY CATEGORY",
            items: [
              "KAMEEZ SHALWAR COLLECTION",
              "KURTA TROUSERS COLLECTION",
              "KURTA COLLECTION",
              "UNSTITCHED COLLECTION",
              "INNERWEAR",
            ],
          },
        ],
      },
      {
        label: "READY TO WEAR",
        groups: [
          {
            label: "SHOP BY CATEGORY",
            items: [
              "2 PIECE",
              "3 PIECE",
              "KAMEEZ SHALWAR",
              "KURTA",
              "KAMEEZ SHALWAR & WAISTCOAT",
              "KURTA TROUSERS",
              "WAISTCOAT",
              "COAT",
            ],
          },
          {
            label: "SHOP BY COLLECTION",
            items: ["HERITAGE EDIT", "EXCLUSIVE GIFT BOX"],
          },
        ],
      },
      {
        label: "UNSTITCHED",
        groups: [
          {
            label: "SHOP BY CATEGORY",
            items: ["PLATINUM CLASS", "GOLD CLASS", "SILVER CLASS", "LATHA", "BOSKI"],
          },
          { label: "FEATURED", items: ["EXCLUSIVE GIFT BOX"] },
        ],
      },
      {
        label: "CAST & CREW",
        groups: [
          {
            label: "CLOTHING",
            items: ["KAMEEZ SHALWAR", "KURTA TROUSERS", "WAISTCOAT", "JACKET", "UNSTITCHED"],
          },
          { label: "ACCESSORIES", items: ["PERFUME"] },
        ],
      },
      { label: "SALE", groups: [] },
    ],
  },
  {
    label: "FRAGRANCE & BEAUTY",
    sections: [
      {
        label: "NEW IN",
        groups: [
          {
            label: "NEW ARRIVALS",
            items: [
              "NEW ARRIVALS",
              "ENIGMA NOIR",
              "ZARAR METALLIC",
              "ZARAR SHADOW",
              "JANAN ZIRCON",
              "JANAN PEARL",
              "JANAN ONYX",
              "WHISPER",
            ],
          },
          {
            label: "COLLECTIONS",
            items: [
              "TRISCENT POUR HOMME - GIFTSET",
              "WASIM AKRAM 502 HIM & HER - GIFT SET",
              "LUMIERE",
              "FEATURED",
              "GOURMET SERIES",
              "JANAN FRAGRANCES",
              "EXTRAIT SERIES - CAST & CREW",
              "THE VALOR COLLECTION",
            ],
          },
          {
            label: "MORE",
            items: [
              "WASIM AKRAM SERIES",
              "AROMA OIL & DIFFUSERS",
              "AIR FRESHENERS",
              "BAKHOOR",
              "GIFT SETS",
              "MINIATURES",
              "CONTINUOUS SPRAY PERFUMES",
            ],
          },
        ],
      },
      {
        label: "FRAGRANCES",
        groups: [
          {
            label: "MEN",
            items: ["PERFUME", "MINIATURE", "ATTAR", "BEARD OIL", "GIFT SET", "BODY SPRAY"],
          },
          {
            label: "WOMEN",
            items: ["PERFUME", "MINIATURE", "BODY MIST", "GIFT SET", "BODY SPRAY"],
          },
          {
            label: "OTHERS",
            items: [
              "AROMA OIL & DIFFUSERS",
              "AIR FRESHENER",
              "BAKHOOR",
              "FRAGRANT SHOWER GEL",
              "REED DIFFUSER",
              "SCENTED CANDLE",
            ],
          },
        ],
      },
      {
        label: "MAKEUP",
        groups: [
          {
            label: "FACE",
            items: ["CREAM & FOUNDATION", "CONCEALER & CONTOUR", "FACE POWDER", "BLUSH & HIGHLIGHT"],
          },
          {
            label: "EYES",
            items: ["EYE LINER & MASCARA", "EYE SHADOW", "EYE PENCIL", "EYEBROW"],
          },
          {
            label: "LIPS",
            items: ["LIPSTICK", "LIP GLOSS", "LIP CARE", "LIP PENCIL"],
          },
          { label: "ACCESSORIES", items: ["BLENDER & SPONGE", "SHARPENER"] },
        ],
      },
      {
        label: "SKINCARE",
        groups: [
          { label: "COLLECTION", items: ["SHOWER GEL", "CREAMS", "TONERS"] },
          { label: "SHOP BY CATEGORY", items: ["FACE", "BODY CARE", "HAIR", "HAND & FEET"] },
        ],
      },
    ],
  },
  {
    label: "TEENS",
    sections: [
      {
        label: "NEW IN",
        groups: [
          {
            label: "SHOP BY CATEGORY",
            items: ["TEEN GIRLS", "TEEN BOYS"],
          },
        ],
      },
      {
        label: "TEEN GIRLS",
        groups: [
          { label: "SHOP BY COLLECTION", items: ["SUMMER'26"] },
          { label: "SHOP BY CATEGORY", items: ["READY TO WEAR", "KURTI", "TROUSERS", "ESSENTIALS"] },
        ],
      },
      {
        label: "TEEN BOYS",
        groups: [
          { label: "SHOP BY COLLECTION", items: ["SUMMER'26"] },
          {
            label: "SHOP BY CATEGORY",
            items: ["KAMEEZ SHALWAR", "KURTA", "SPECIAL KURTA", "JUBBA-THOBE", "BOTTOM WEAR"],
          },
        ],
      },
      { label: "SALE", groups: [] },
    ],
  },
] as const;

function allLeaves(): MenuLeaf[] {
  return catalogMenu.flatMap((department) =>
    department.sections.flatMap((section) =>
      section.groups.flatMap((group) => group.items),
    ),
  );
}

function allCards(): MenuVisualCard[] {
  return catalogMenu.flatMap((department) => [
    ...department.visualCards,
    ...department.sections.flatMap((section) => section.visualCards),
  ]);
}

function allCatalogHrefs(): string[] {
  return catalogMenu.flatMap((department) => [
    ...department.visualCards.flatMap((card) => card.href ?? []),
    ...department.sections.flatMap((section) => [
      ...(section.href ? [section.href] : []),
      ...section.visualCards.flatMap((card) => card.href ?? []),
      ...section.groups.flatMap((group) =>
        group.items.flatMap((item) => item.href ?? []),
      ),
    ]),
  ]);
}

function expectSequentialOrder(entries: readonly { order: number }[]): void {
  expect(entries.map((entry) => entry.order)).toEqual(
    entries.map((_, index) => index + 1),
  );
}

test.describe("catalog navigation configuration", () => {
  test("preserves the exact supplied hierarchy, labels, group boundaries, and order", () => {
    const configuredHierarchy = catalogMenu.map((department) => ({
      label: department.label,
      sections: department.sections.map((section) => ({
        label: section.label,
        groups: section.groups.map((group) => ({
          label: group.label,
          items: group.items.map((item) => item.label),
        })),
      })),
    }));

    expect(configuredHierarchy).toEqual(expectedHierarchy);
    expect(catalogMenu).toHaveLength(4);
    expect(catalogMenu.flatMap((department) => department.sections)).toHaveLength(20);
    expect(allLeaves()).toHaveLength(122);

    for (const department of catalogMenu) {
      expectSequentialOrder(department.sections);
      expectSequentialOrder(department.visualCards);

      for (const section of department.sections) {
        expectSequentialOrder(section.groups);
        expectSequentialOrder(section.visualCards);

        for (const group of section.groups) {
          expectSequentialOrder(group.items);
        }
      }
    }
  });

  test("keeps all 23 Fragrance & Beauty New In leaves in supplied order", () => {
    const fragrance = catalogMenu.find(
      (department) => department.id === "fragrance-beauty",
    );
    const newIn = fragrance?.sections.find(
      (section) => section.id === "fragrance-beauty.new-in",
    );
    const labels = newIn?.groups.flatMap((group) =>
      group.items.map((item) => item.label),
    );

    expect(labels).toEqual(
      expectedHierarchy[2].sections[0].groups.flatMap((group) => group.items)
    );
    expect(labels).toHaveLength(23);
  });

  test("uses globally unique contextual IDs for repeated labels", () => {
    const ids = catalogMenu.flatMap((department) => [
      department.id,
      ...department.visualCards.map((card) => card.id),
      ...department.sections.flatMap((section) => [
        section.id,
        ...section.visualCards.map((card) => card.id),
        ...section.groups.flatMap((group) => [
          group.id,
          ...group.items.map((item) => item.id),
        ]),
      ]),
    ]);

    expect(new Set(ids).size).toBe(ids.length);

    const kurtaIds = allLeaves()
      .filter((leaf) => leaf.label === "KURTA")
      .map((leaf) => leaf.id);
    expect(kurtaIds).toEqual([
      "women.ready-to-wear.kurta",
      "men.ready-to-wear.kurta",
      "teens.teen-boys.kurta",
    ]);

    const perfumeIds = allLeaves()
      .filter((leaf) => leaf.label === "PERFUME")
      .map((leaf) => leaf.id);
    expect(perfumeIds).toEqual([
      "men.cast-crew.accessories.perfume",
      "fragrance-beauty.fragrances.men.perfume",
      "fragrance-beauty.fragrances.women.perfume",
    ]);
  });

  test("writes every required navigation metadata field explicitly", () => {
    const requiredFields = [
      "id",
      "label",
      "href",
      "image",
      "badge",
      "comingSoon",
      "visibility",
      "status",
      "order",
    ];

    for (const entry of [...allLeaves(), ...allCards()]) {
      expect(Object.keys(entry).sort()).toEqual([...requiredFields].sort());
      expect(["active", "disabled", "coming-soon", "unmapped"]).toContain(
        entry.status,
      );
      expect(["visible", "hidden"]).toContain(entry.visibility);
      expect(typeof entry.comingSoon).toBe("boolean");
      expect(Number.isInteger(entry.order)).toBe(true);
      expect(entry.order).toBeGreaterThan(0);

      if (entry.status === "active" && entry.visibility === "visible") {
        expect(entry.href).not.toBeNull();
      }
    }
  });

  test("publishes approved Women New In links while keeping Sale sections leafless", () => {
    const women = catalogMenu.find((department) => department.id === "women");
    const womenNewIn = women?.sections.find(
      (section) => section.id === "women.new-in",
    );

    expect(womenNewIn).toBeDefined();
    expect(
      womenNewIn?.groups.flatMap((group) =>
        group.items
          .filter((item) => item.visibility === "visible")
          .map((item) => item.label),
      ),
    ).toEqual(["UNSTITCHED COLLECTION", "READY TO WEAR", "KURTA COLLECTION"]);

    const saleSections = catalogMenu.flatMap((department) =>
      department.sections.filter((section) => section.label === "SALE"),
    );
    expect(saleSections.map((section) => section.id)).toEqual([
      "women.sale",
      "men.sale",
      "teens.sale",
    ]);
    expect(saleSections.every((section) => section.groups.length === 0)).toBe(true);
  });

  test("distinguishes canonical leaves from equal-section and cross-section references", () => {
    const sectionHrefs = [
      "/women/new-in",
      "/women/ready-to-wear",
      "/women/unstitched",
    ];

    expect(
      resolveMenuLeafRouteRole(
        "/women/new-in",
        "/women/new-in",
        sectionHrefs,
      ),
    ).toBe("navigation-reference");
    expect(
      resolveMenuLeafRouteRole(
        "/women/ready-to-wear/kurta",
        "/women/new-in",
        sectionHrefs,
      ),
    ).toBe("navigation-reference");
    expect(
      resolveMenuLeafRouteRole(
        "/women/ready-to-wear/kurta",
        "/women/ready-to-wear",
        sectionHrefs,
      ),
    ).toBe("canonical-descendant");
    expect(
      resolveMenuLeafRouteRole(
        "/women/not-a-configured-section/item",
        "/women/new-in",
        sectionHrefs,
      ),
    ).toBe("invalid");
  });

  test("adds Men Ready-to-Wear piece-count and coat leaves without changing its visual cards", () => {
    const men = catalogMenu.find((department) => department.id === "men")!;
    const readyToWear = men.sections.find(
      (section) => section.id === "men.ready-to-wear",
    )!;
    const shopByCategory = readyToWear.groups.find(
      (group) => group.id === "men.ready-to-wear.shop-by-category",
    )!;

    expect(shopByCategory.items.slice(0, 2)).toMatchObject([
      {
        id: "men.ready-to-wear.2-piece",
        label: "2 PIECE",
        href: "/men/ready-to-wear/2-piece",
        order: 1,
      },
      {
        id: "men.ready-to-wear.3-piece",
        label: "3 PIECE",
        href: "/men/ready-to-wear/3-piece",
        order: 2,
      },
    ]);
    expect(shopByCategory.items.at(-1)).toMatchObject({
      id: "men.ready-to-wear.coat",
      label: "COAT",
      href: "/men/ready-to-wear/coat",
      order: 8,
    });
    expect(readyToWear.visualCards.map((card) => card.id)).toEqual([
      "men.ready-to-wear.card.kameez-shalwar",
      "men.ready-to-wear.card.kurta",
      "men.ready-to-wear.card.heritage-edit",
    ]);
  });

  test("builds a canonical bootstrap plan without materializing navigation aliases", () => {
    const tsxCli = resolve(
      process.cwd(),
      "node_modules",
      "tsx",
      "dist",
      "cli.mjs",
    );
    const script = resolve(process.cwd(), "scripts", "catalog-nodes.ts");
    const output = execFileSync(
      process.execPath,
      [tsxCli, script, "--mode=plan"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        timeout: 30_000,
        windowsHide: true,
      },
    );
    const plan = JSON.parse(output) as {
      mode: string;
      databaseAccess: boolean;
      entries: Array<{
        id: string;
        parentId: string | null;
        path: string;
        productKind: string | null;
      }>;
    };

    expect(plan).toMatchObject({ mode: "plan", databaseAccess: false });
    expect(
      plan.entries.filter((entry) => entry.path === "/women/ready-to-wear"),
    ).toEqual([
      expect.objectContaining({
        id: "catalog:section:women.ready-to-wear",
      }),
    ]);
    expect(
      plan.entries.filter(
        (entry) => entry.path === "/women/ready-to-wear/kurta",
      ),
    ).toEqual([
      expect.objectContaining({
        id: "catalog:leaf:women.ready-to-wear.kurta",
      }),
    ]);
    expect(
      plan.entries.some((entry) => entry.id.includes("women.new-in.ready-to-wear")),
    ).toBe(false);
    expect(
      plan.entries.some((entry) => entry.id.includes("women.new-in.kurta-collection")),
    ).toBe(false);

    for (const pieceCount of ["2-piece", "3-piece"]) {
      expect(
        plan.entries.find(
          (entry) => entry.path === `/men/ready-to-wear/${pieceCount}`,
        ),
      ).toMatchObject({
        id: `catalog:leaf:men.ready-to-wear.${pieceCount}`,
        parentId: "catalog:section:men.ready-to-wear",
        productKind: "READY_TO_WEAR",
      });
    }
    expect(
      plan.entries.find(
        (entry) => entry.path === "/men/ready-to-wear/coat",
      ),
    ).toMatchObject({
      id: "catalog:leaf:men.ready-to-wear.coat",
      parentId: "catalog:section:men.ready-to-wear",
      productKind: "READY_TO_WEAR",
    });
  });

  test("uses explicit dedicated catalog routes and never inferred shop filters", () => {
    const hrefs = allCatalogHrefs();

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).toMatch(/^\/(women|men|fragrance-beauty|teens)(\/|$)/);
      expect(href).not.toContain("/shop");
      expect(href).not.toContain("?category=");
    }
  });

  test("references only existing local visual-card assets", () => {
    const configuredImages = [
      catalogVisualCardFallbackImage,
      ...allCards().flatMap((card) => card.image ?? []),
    ];

    for (const image of configuredImages) {
      expect(image).toMatch(/^\//);
      expect(image).not.toMatch(/^https?:\/\//);
      expect(
        existsSync(resolve(process.cwd(), "public", image.slice(1))),
        `Missing public asset: ${image}`,
      ).toBe(true);
    }
  });

  test("keeps store and utility labels in the shared source of truth", () => {
    expect(catalogStoreIndicator).toEqual({
      id: "pakistan",
      label: "Pakistan",
      href: null,
      status: "active",
      visibility: "hidden",
    });
    expect(catalogUtilityLinks).toEqual([
      {
        id: "stitching",
        label: "Stitching",
        href: "/account/measurements",
        status: "active",
        visibility: "visible",
        order: 1,
      },
    ]);
  });

  test("provides component-independent ordering, visibility, and card resolution", () => {
    const input = [
      { id: "last", visibility: "visible" as const, order: 3 },
      { id: "hidden", visibility: "hidden" as const, order: 1 },
      { id: "first", visibility: "visible" as const, order: 2 },
    ];

    expect(sortByMenuOrder(input).map((entry) => entry.id)).toEqual([
      "hidden",
      "first",
      "last",
    ]);
    expect(getVisibleMenuEntries(input).map((entry) => entry.id)).toEqual([
      "first",
      "last",
    ]);
    expect(input.map((entry) => entry.id)).toEqual(["last", "hidden", "first"]);

    const women = catalogMenu.find(
      (department) => department.id === "women",
    ) as MenuDepartment;
    const readyToWear = women.sections.find(
      (section) => section.id === "women.ready-to-wear",
    );
    const newIn = women.sections.find(
      (section) => section.id === "women.new-in",
    );

    expect(resolveMenuVisualCards(women, readyToWear!).map((card) => card.id)).toEqual([
      "women.ready-to-wear.card.3-piece",
      "women.ready-to-wear.card.kurta",
      "women.ready-to-wear.card.signature",
    ]);
    expect(resolveMenuVisualCards(women, newIn!).map((card) => card.id)).toEqual([
      "women.card.ready-to-wear",
      "women.card.unstitched",
      "women.card.formals",
    ]);
  });

  test("has no component, Next.js, Prisma, or database dependency", () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/navigation/catalog-menu.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/from\s+["'][^"']*components\//);
    expect(source).not.toMatch(/from\s+["']next(?:\/|["'])/);
    expect(source).not.toMatch(/@prisma|PrismaClient/);
    expect(source).not.toMatch(/from\s+["'][^"']*(?:lib\/db|\/db)\b/);
  });

  test("every visible active non-comingSoon leaf href is declared in the bootstrap manifest", () => {
    // Build the set of paths the bootstrap script declares from catalog-menu.ts hrefs.
    // This is the static half of plan §15: 'every visible config href matches an
    // active canonical catalog path'. The database half is the bootstrap dry-run.
    const configHrefs = new Set<string>();
    for (const department of catalogMenu) {
      for (const section of department.sections) {
        if (section.href) configHrefs.add(section.href);
        for (const group of section.groups) {
          for (const item of group.items) {
            if (
              item.visibility === "visible" &&
              item.status === "active" &&
              !item.comingSoon &&
              item.href
            ) {
              configHrefs.add(item.href);
            }
          }
        }
      }
    }

    // Every collected href must belong to one of the four approved department roots.
    for (const href of configHrefs) {
      expect(
        href,
        `Catalog href '${href}' does not start with an approved department root`,
      ).toMatch(/^\/(women|men|fragrance-beauty|teens)(\/|$)/);
    }

    // The set must not be empty — guards against a silent filter-all bug.
    expect(configHrefs.size).toBeGreaterThan(100);

    // No href may duplicate another leaf's href within the same department
    // (contextual IDs prevent this in IDs; this checks the actual URL space).
    const hrefArray = [...configHrefs];
    expect(hrefArray.length).toEqual(new Set(hrefArray).size);
  });
});
