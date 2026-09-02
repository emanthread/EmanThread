/**
 * Static catalog navigation configuration.
 *
 * Keep labels, grouping, and ordering aligned with the approved implementation
 * plan. This module is deliberately independent of Prisma and runtime data.
 */

export type MenuStatus = "active" | "disabled" | "coming-soon" | "unmapped";
export type MenuVisibility = "visible" | "hidden";

export type MenuVisualCard = {
  id: string;
  label: string;
  href: string | null;
  image: string | null;
  badge: string | null;
  comingSoon: boolean;
  visibility: MenuVisibility;
  status: MenuStatus;
  order: number;
};

export type MenuLeaf = {
  id: string;
  label: string;
  href: string | null;
  image: string | null;
  badge: string | null;
  comingSoon: boolean;
  visibility: MenuVisibility;
  status: MenuStatus;
  order: number;
};

export type MenuGroup = {
  id: string;
  label: string;
  items: MenuLeaf[];
  order: number;
};

export type MenuSection = {
  id: string;
  label: string;
  href: string | null;
  groups: MenuGroup[];
  visualCards: MenuVisualCard[];
  order: number;
};

export type MenuDepartment = {
  id: "women" | "men" | "fragrance-beauty" | "teens";
  label: string;
  sections: MenuSection[];
  visualCards: MenuVisualCard[];
  order: number;
};

export type CatalogUtilityLink = {
  id: "stitching";
  label: string;
  href: string;
  status: MenuStatus;
  visibility: MenuVisibility;
  order: number;
};

export type CatalogStoreIndicator = {
  id: "pakistan";
  label: string;
  href: string | null;
  status: MenuStatus;
  visibility: MenuVisibility;
};

/**
 * Used by menu presentations when an approved card has no dedicated artwork.
 * The file is local and already present in public/.
 */
export const catalogVisualCardFallbackImage = "/placeholder.jpg";

export const catalogStoreIndicator: CatalogStoreIndicator = {
  id: "pakistan",
  label: "Pakistan",
  href: null,
  status: "active",
  visibility: "hidden",
};

export const catalogUtilityLinks: CatalogUtilityLink[] = [
  {
    id: "stitching",
    label: "Stitching",
    href: "/account/measurements",
    status: "active",
    visibility: "visible",
    order: 1,
  },
];

export const catalogMenu: MenuDepartment[] = [
  {
    id: "women",
    label: "WOMEN",
    order: 1,
    visualCards: [
      {
        id: "women.card.ready-to-wear",
        label: "READY TO WEAR",
        href: "/women/ready-to-wear",
        image: "/images/fabrics/hero_fabric_summer_1780065728421.png",
        badge: null,
        comingSoon: false,
        visibility: "visible",
        status: "active",
        order: 1,
      },
      {
        id: "women.card.unstitched",
        label: "UNSTITCHED",
        href: "/women/unstitched",
        image: "/images/fabrics/cat_cotton_1776582727723.png",
        badge: null,
        comingSoon: false,
        visibility: "visible",
        status: "active",
        order: 2,
      },
      {
        id: "women.card.formals",
        label: "FORMALS",
        href: "/women/formals",
        image: "/images/fabrics/promo_1776582682565.png",
        badge: null,
        comingSoon: false,
        visibility: "visible",
        status: "active",
        order: 3,
      },
    ],
    sections: [
      {
        id: "women.new-in",
        label: "NEW IN",
        href: "/women/new-in",
        order: 1,
        groups: [
          {
            id: "women.new-in.shop-by-category",
            label: "SHOP BY CATEGORY",
            order: 1,
            items: [
              { id: "women.new-in.unstitched-collection", label: "UNSTITCHED COLLECTION", href: "/women/new-in", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "women.new-in.ready-to-wear", label: "READY TO WEAR", href: "/women/ready-to-wear", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "women.new-in.kurta-collection", label: "KURTA COLLECTION", href: "/women/ready-to-wear/kurta", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
            ],
          },
        ],
        visualCards: [],
      },
      {
        id: "women.ready-to-wear",
        label: "READY TO WEAR",
        href: "/women/ready-to-wear",
        order: 2,
        groups: [
          {
            id: "women.ready-to-wear.shop-by-category",
            label: "SHOP BY CATEGORY",
            order: 1,
            items: [
              { id: "women.ready-to-wear.3-piece", label: "3 PIECE", href: "/women/ready-to-wear/3-piece", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "women.ready-to-wear.shirt-dupatta", label: "SHIRT & DUPATTA", href: "/women/ready-to-wear/shirt-dupatta", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "women.ready-to-wear.kurta", label: "KURTA", href: "/women/ready-to-wear/kurta", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
              { id: "women.ready-to-wear.modest-wear", label: "MODEST WEAR", href: "/women/ready-to-wear/modest-wear", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 4 },
              { id: "women.ready-to-wear.bottomwear", label: "BOTTOMWEAR", href: "/women/ready-to-wear/bottomwear", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 5 },
            ],
          },
          {
            id: "women.ready-to-wear.shop-by-collection",
            label: "SHOP BY COLLECTION",
            order: 2,
            items: [
              { id: "women.ready-to-wear.signature", label: "SIGNATURE", href: "/women/ready-to-wear/signature", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "women.ready-to-wear.luxe", label: "LUXE", href: "/women/ready-to-wear/luxe", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "women.ready-to-wear.matching-separates", label: "MATCHING SEPARATES", href: "/women/ready-to-wear/matching-separates", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
            ],
          },
          {
            id: "women.ready-to-wear.shop-by-occasion",
            label: "SHOP BY OCCASION",
            order: 3,
            items: [
              { id: "women.ready-to-wear.formals", label: "FORMALS", href: "/women/formals", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "women.ready-to-wear.casual", label: "CASUAL", href: "/women/ready-to-wear/casual", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "women.ready-to-wear.partywear", label: "PARTYWEAR", href: "/women/ready-to-wear/partywear", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
              { id: "women.ready-to-wear.bridal-wear", label: "BRIDAL WEAR", href: "/women/ready-to-wear/bridal-wear", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 4 },
            ],
          },
        ],
        visualCards: [
          {
            id: "women.ready-to-wear.card.3-piece",
            label: "3 PIECE",
            href: "/women/ready-to-wear/3-piece",
            image: "/images/fabrics/cat_cotton_1776582727723.png",
            badge: null,
            comingSoon: false,
            visibility: "visible",
            status: "active",
            order: 1,
          },
          {
            id: "women.ready-to-wear.card.kurta",
            label: "KURTA",
            href: "/women/ready-to-wear/kurta",
            image: "/images/fabrics/hero_fabric_summer_1780065728421.png",
            badge: null,
            comingSoon: false,
            visibility: "visible",
            status: "active",
            order: 2,
          },
          {
            id: "women.ready-to-wear.card.signature",
            label: "SIGNATURE",
            href: "/women/ready-to-wear/signature",
            image: "/images/fabrics/promo_1776582682565.png",
            badge: null,
            comingSoon: false,
            visibility: "visible",
            status: "active",
            order: 3,
          },
        ],
      },
      {
        id: "women.unstitched",
        label: "UNSTITCHED",
        href: "/women/unstitched",
        order: 3,
        groups: [
          {
            id: "women.unstitched.shop-by-category",
            label: "SHOP BY CATEGORY",
            order: 1,
            items: [
              { id: "women.unstitched.3-piece", label: "3 PIECE", href: "/women/unstitched/3-piece", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "women.unstitched.2-piece", label: "2 PIECE", href: "/women/unstitched/2-piece", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "women.unstitched.1-piece", label: "1 PIECE", href: "/women/unstitched/1-piece", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
              { id: "women.unstitched.saari-blouse", label: "SAARI BLOUSE", href: "/women/unstitched/saari-blouse", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 4 },
            ],
          },
          {
            id: "women.unstitched.shop-by-collection",
            label: "SHOP BY COLLECTION",
            order: 2,
            items: [
              { id: "women.unstitched.noya", label: "NOYA", href: "/women/unstitched/noya", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "women.unstitched.zariya", label: "ZARIYA", href: "/women/unstitched/zariya", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "women.unstitched.luxe", label: "LUXE", href: "/women/unstitched/luxe", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
            ],
          },
          {
            id: "women.unstitched.shop-by-occasion",
            label: "SHOP BY OCCASION",
            order: 3,
            items: [
              { id: "women.unstitched.partywear", label: "PARTYWEAR", href: "/women/unstitched/partywear", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
            ],
          },
        ],
        visualCards: [
          {
            id: "women.unstitched.card.3-piece",
            label: "3 PIECE",
            href: "/women/unstitched/3-piece",
            image: "/images/fabrics/hero_banner_1_1776582592087.png",
            badge: null,
            comingSoon: false,
            visibility: "visible",
            status: "active",
            order: 1,
          },
          {
            id: "women.unstitched.card.noya",
            label: "NOYA",
            href: "/women/unstitched/noya",
            image: "/images/fabrics/cat_wool_1776583171222.png",
            badge: null,
            comingSoon: false,
            visibility: "visible",
            status: "active",
            order: 2,
          },
          {
            id: "women.unstitched.card.luxe",
            label: "LUXE",
            href: "/women/unstitched/luxe",
            image: "/images/fabrics/hero_boski_1776582616605.png",
            badge: null,
            comingSoon: false,
            visibility: "visible",
            status: "active",
            order: 3,
          },
        ],
      },
      {
        id: "women.formals",
        label: "FORMALS",
        href: "/women/formals",
        order: 4,
        groups: [
          {
            id: "women.formals.shop-by-category",
            label: "SHOP BY CATEGORY",
            order: 1,
            items: [
              { id: "women.formals.rtw-2-piece", label: "RTW 2 PIECE", href: "/women/formals/rtw-2-piece", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "women.formals.rtw-3-piece", label: "RTW 3 PIECE", href: "/women/formals/rtw-3-piece", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "women.formals.unstitched", label: "UNSTITCHED", href: "/women/formals/unstitched", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
            ],
          },
          {
            id: "women.formals.shop-by-collection",
            label: "SHOP BY COLLECTION",
            order: 2,
            items: [
              { id: "women.formals.festive-26", label: "FESTIVE '26", href: "/women/formals/festive-26", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
            ],
          },
        ],
        visualCards: [],
      },
      {
        id: "women.sale",
        label: "SALE",
        href: "/women/sale",
        order: 5,
        groups: [],
        visualCards: [],
      },
    ],
  },
  {
    id: "men",
    label: "MEN",
    order: 2,
    visualCards: [
      {
        id: "men.card.new-in",
        label: "NEW IN",
        href: "/men/new-in",
        image: "/images/fabrics/hero_fabric_boski_1780066040016.png",
        badge: null,
        comingSoon: false,
        visibility: "visible",
        status: "active",
        order: 1,
      },
      {
        id: "men.card.ready-to-wear",
        label: "READY TO WEAR",
        href: "/men/ready-to-wear",
        image: "/images/fabrics/hero_fabric_wash_wear_1780066058724.png",
        badge: null,
        comingSoon: false,
        visibility: "visible",
        status: "active",
        order: 2,
      },
      {
        id: "men.card.unstitched",
        label: "UNSTITCHED",
        href: "/men/unstitched",
        image: "/images/fabrics/hero_boski_1776582616605.png",
        badge: null,
        comingSoon: false,
        visibility: "visible",
        status: "active",
        order: 3,
      },
    ],
    sections: [
      {
        id: "men.new-in",
        label: "NEW IN",
        href: "/men/new-in",
        order: 1,
        groups: [
          {
            id: "men.new-in.shop-by-category",
            label: "SHOP BY CATEGORY",
            order: 1,
            items: [
              { id: "men.new-in.kameez-shalwar-collection", label: "KAMEEZ SHALWAR COLLECTION", href: "/men/new-in/kameez-shalwar-collection", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "men.new-in.kurta-trousers-collection", label: "KURTA TROUSERS COLLECTION", href: "/men/new-in/kurta-trousers-collection", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "men.new-in.kurta-collection", label: "KURTA COLLECTION", href: "/men/new-in/kurta-collection", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
              { id: "men.new-in.unstitched-collection", label: "UNSTITCHED COLLECTION", href: "/men/new-in/unstitched-collection", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 4 },
              { id: "men.new-in.innerwear", label: "INNERWEAR", href: "/men/new-in/innerwear", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 5 },
            ],
          },
        ],
        visualCards: [],
      },
      {
        id: "men.ready-to-wear",
        label: "READY TO WEAR",
        href: "/men/ready-to-wear",
        order: 2,
        groups: [
          {
            id: "men.ready-to-wear.shop-by-category",
            label: "SHOP BY CATEGORY",
            order: 1,
            items: [
              { id: "men.ready-to-wear.2-piece", label: "2 PIECE", href: "/men/ready-to-wear/2-piece", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "men.ready-to-wear.3-piece", label: "3 PIECE", href: "/men/ready-to-wear/3-piece", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "men.ready-to-wear.kameez-shalwar", label: "KAMEEZ SHALWAR", href: "/men/ready-to-wear/kameez-shalwar", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
              { id: "men.ready-to-wear.kurta", label: "KURTA", href: "/men/ready-to-wear/kurta", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 4 },
              { id: "men.ready-to-wear.kameez-shalwar-waistcoat", label: "KAMEEZ SHALWAR & WAISTCOAT", href: "/men/ready-to-wear/kameez-shalwar-waistcoat", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 5 },
              { id: "men.ready-to-wear.kurta-trousers", label: "KURTA TROUSERS", href: "/men/ready-to-wear/kurta-trousers", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 6 },
              { id: "men.ready-to-wear.waistcoat", label: "WAISTCOAT", href: "/men/ready-to-wear/waistcoat", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 7 },
              { id: "men.ready-to-wear.coat", label: "COAT", href: "/men/ready-to-wear/coat", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 8 },
              { id: "men.ready-to-wear.dress-shirt", label: "DRESS SHIRT", href: "/men/ready-to-wear/dress-shirt", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 9 },
            ],
          },
          {
            id: "men.ready-to-wear.shop-by-collection",
            label: "SHOP BY COLLECTION",
            order: 2,
            items: [
              { id: "men.ready-to-wear.heritage-edit", label: "HERITAGE EDIT", href: "/men/ready-to-wear/heritage-edit", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "men.ready-to-wear.exclusive-gift-box", label: "EXCLUSIVE GIFT BOX", href: "/men/ready-to-wear/exclusive-gift-box", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
            ],
          },
          {
            id: "men.ready-to-wear.shop-by-occasion",
            label: "SHOP BY OCCASION",
            order: 3,
            items: [
              { id: "men.ready-to-wear.formal", label: "FORMAL", href: "/men/ready-to-wear/formal", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "men.ready-to-wear.casual", label: "CASUAL", href: "/men/ready-to-wear/casual", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
            ],
          },
        ],
        visualCards: [
          {
            id: "men.ready-to-wear.card.kameez-shalwar",
            label: "KAMEEZ SHALWAR",
            href: "/men/ready-to-wear/kameez-shalwar",
            image: "/images/fabrics/hero_fabric_boski_1780066040016.png",
            badge: null,
            comingSoon: false,
            visibility: "visible",
            status: "active",
            order: 1,
          },
          {
            id: "men.ready-to-wear.card.kurta",
            label: "KURTA",
            href: "/men/ready-to-wear/kurta",
            image: "/images/fabrics/hero_wash_1776582631696.png",
            badge: null,
            comingSoon: false,
            visibility: "visible",
            status: "active",
            order: 2,
          },
          {
            id: "men.ready-to-wear.card.heritage-edit",
            label: "HERITAGE EDIT",
            href: "/men/ready-to-wear/heritage-edit",
            image: "/images/fabrics/hero_fabric_wash_wear_1780066058724.png",
            badge: null,
            comingSoon: false,
            visibility: "visible",
            status: "active",
            order: 3,
          },
        ],
      },
      {
        id: "men.unstitched",
        label: "UNSTITCHED",
        href: "/men/unstitched",
        order: 3,
        groups: [
          {
            id: "men.unstitched.shop-by-category",
            label: "SHOP BY CATEGORY",
            order: 1,
            items: [
              { id: "men.unstitched.platinum-class", label: "PLATINUM CLASS", href: "/men/unstitched/platinum-class", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "men.unstitched.gold-class", label: "GOLD CLASS", href: "/men/unstitched/gold-class", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "men.unstitched.silver-class", label: "SILVER CLASS", href: "/men/unstitched/silver-class", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
              { id: "men.unstitched.latha", label: "MEDIUM CLASS", href: "/men/unstitched/latha", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 4 },
              { id: "men.unstitched.boski", label: "COTTON COLLECTION", href: "/men/unstitched/boski", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 5 },
            ],
          },
          {
            id: "men.unstitched.featured",
            label: "FEATURED",
            order: 2,
            items: [
              { id: "men.unstitched.exclusive-gift-box", label: "EXCLUSIVE GIFT BOX", href: "/men/unstitched/exclusive-gift-box", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
            ],
          },
        ],
        visualCards: [],
      },
      {
        id: "men.cast-crew",
        label: "CAST & CREW",
        href: "/men/cast-crew",
        order: 4,
        groups: [
          {
            id: "men.cast-crew.clothing",
            label: "CLOTHING",
            order: 1,
            items: [
              { id: "men.cast-crew.clothing.kameez-shalwar", label: "KAMEEZ SHALWAR", href: "/men/cast-crew/clothing/kameez-shalwar", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "men.cast-crew.clothing.kurta-trousers", label: "KURTA TROUSERS", href: "/men/cast-crew/clothing/kurta-trousers", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "men.cast-crew.clothing.waistcoat", label: "WAISTCOAT", href: "/men/cast-crew/clothing/waistcoat", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
              { id: "men.cast-crew.clothing.jacket", label: "JACKET", href: "/men/cast-crew/clothing/jacket", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 4 },
              { id: "men.cast-crew.clothing.unstitched", label: "UNSTITCHED", href: "/men/cast-crew/clothing/unstitched", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 5 },
            ],
          },
          {
            id: "men.cast-crew.accessories",
            label: "ACCESSORIES",
            order: 2,
            items: [
              { id: "men.cast-crew.accessories.perfume", label: "PERFUME", href: "/men/cast-crew/accessories/perfume", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
            ],
          },
        ],
        visualCards: [],
      },
      {
        id: "men.sale",
        label: "SALE",
        href: "/men/sale",
        order: 5,
        groups: [],
        visualCards: [],
      },
    ],
  },
  {
    id: "fragrance-beauty",
    label: "FRAGRANCE & BEAUTY",
    order: 3,
    visualCards: [
      {
        id: "fragrance-beauty.card.fragrances",
        label: "FRAGRANCES",
        href: "/fragrance-beauty/fragrances",
        image: "/images/fabrics/promo_1776582682565.png",
        badge: null,
        comingSoon: false,
        visibility: "visible",
        status: "active",
        order: 1,
      },
      {
        id: "fragrance-beauty.card.makeup",
        label: "MAKEUP",
        href: "/fragrance-beauty/makeup",
        image: "/images/fabrics/hero_banner_1_1776582592087.png",
        badge: null,
        comingSoon: false,
        visibility: "visible",
        status: "active",
        order: 2,
      },
      {
        id: "fragrance-beauty.card.skincare",
        label: "SKINCARE",
        href: "/fragrance-beauty/skincare",
        image: "/placeholder.jpg",
        badge: null,
        comingSoon: false,
        visibility: "visible",
        status: "active",
        order: 3,
      },
    ],
    sections: [
      {
        id: "fragrance-beauty.new-in",
        label: "NEW IN",
        href: "/fragrance-beauty/new-in",
        order: 1,
        groups: [
          {
            id: "fragrance-beauty.new-in.new-arrivals-group",
            label: "NEW ARRIVALS",
            order: 1,
            items: [
              { id: "fragrance-beauty.new-in.new-arrivals", label: "NEW ARRIVALS", href: "/fragrance-beauty/new-in/new-arrivals", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "fragrance-beauty.new-in.enigma-noir", label: "ENIGMA NOIR", href: "/fragrance-beauty/new-in/enigma-noir", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "fragrance-beauty.new-in.zarar-metallic", label: "ZARAR METALLIC", href: "/fragrance-beauty/new-in/zarar-metallic", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
              { id: "fragrance-beauty.new-in.zarar-shadow", label: "ZARAR SHADOW", href: "/fragrance-beauty/new-in/zarar-shadow", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 4 },
              { id: "fragrance-beauty.new-in.janan-zircon", label: "JANAN ZIRCON", href: "/fragrance-beauty/new-in/janan-zircon", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 5 },
              { id: "fragrance-beauty.new-in.janan-pearl", label: "JANAN PEARL", href: "/fragrance-beauty/new-in/janan-pearl", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 6 },
              { id: "fragrance-beauty.new-in.janan-onyx", label: "JANAN ONYX", href: "/fragrance-beauty/new-in/janan-onyx", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 7 },
              { id: "fragrance-beauty.new-in.whisper", label: "WHISPER", href: "/fragrance-beauty/new-in/whisper", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 8 },
            ],
          },
          {
            id: "fragrance-beauty.new-in.collections",
            label: "COLLECTIONS",
            order: 2,
            items: [
              { id: "fragrance-beauty.new-in.triscent-pour-homme-giftset", label: "TRISCENT POUR HOMME - GIFTSET", href: "/fragrance-beauty/new-in/triscent-pour-homme-giftset", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "fragrance-beauty.new-in.wasim-akram-502-him-her-gift-set", label: "WASIM AKRAM 502 HIM & HER - GIFT SET", href: "/fragrance-beauty/new-in/wasim-akram-502-him-her-gift-set", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "fragrance-beauty.new-in.lumiere", label: "LUMIERE", href: "/fragrance-beauty/new-in/lumiere", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
              { id: "fragrance-beauty.new-in.featured", label: "FEATURED", href: "/fragrance-beauty/new-in/featured", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 4 },
              { id: "fragrance-beauty.new-in.gourmet-series", label: "GOURMET SERIES", href: "/fragrance-beauty/new-in/gourmet-series", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 5 },
              { id: "fragrance-beauty.new-in.janan-fragrances", label: "JANAN FRAGRANCES", href: "/fragrance-beauty/new-in/janan-fragrances", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 6 },
              { id: "fragrance-beauty.new-in.extrait-series-cast-crew", label: "EXTRAIT SERIES - CAST & CREW", href: "/fragrance-beauty/new-in/extrait-series-cast-crew", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 7 },
              { id: "fragrance-beauty.new-in.valor-collection", label: "THE VALOR COLLECTION", href: "/fragrance-beauty/new-in/valor-collection", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 8 },
            ],
          },
          {
            id: "fragrance-beauty.new-in.more",
            label: "MORE",
            order: 3,
            items: [
              { id: "fragrance-beauty.new-in.wasim-akram-series", label: "WASIM AKRAM SERIES", href: "/fragrance-beauty/new-in/wasim-akram-series", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "fragrance-beauty.new-in.aroma-oil-diffusers", label: "AROMA OIL & DIFFUSERS", href: "/fragrance-beauty/new-in/aroma-oil-diffusers", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "fragrance-beauty.new-in.air-fresheners", label: "AIR FRESHENERS", href: "/fragrance-beauty/new-in/air-fresheners", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
              { id: "fragrance-beauty.new-in.bakhoor", label: "BAKHOOR", href: "/fragrance-beauty/new-in/bakhoor", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 4 },
              { id: "fragrance-beauty.new-in.gift-sets", label: "GIFT SETS", href: "/fragrance-beauty/new-in/gift-sets", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 5 },
              { id: "fragrance-beauty.new-in.miniatures", label: "MINIATURES", href: "/fragrance-beauty/new-in/miniatures", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 6 },
              { id: "fragrance-beauty.new-in.continuous-spray-perfumes", label: "CONTINUOUS SPRAY PERFUMES", href: "/fragrance-beauty/new-in/continuous-spray-perfumes", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 7 },
            ],
          },
        ],
        visualCards: [],
      },
      {
        id: "fragrance-beauty.fragrances",
        label: "FRAGRANCES",
        href: "/fragrance-beauty/fragrances",
        order: 2,
        groups: [
          {
            id: "fragrance-beauty.fragrances.men",
            label: "MEN",
            order: 1,
            items: [
              { id: "fragrance-beauty.fragrances.men.perfume", label: "PERFUME", href: "/fragrance-beauty/fragrances/men/perfume", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "fragrance-beauty.fragrances.men.miniature", label: "MINIATURE", href: "/fragrance-beauty/fragrances/men/miniature", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "fragrance-beauty.fragrances.men.attar", label: "ATTAR", href: "/fragrance-beauty/fragrances/men/attar", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
              { id: "fragrance-beauty.fragrances.men.beard-oil", label: "BEARD OIL", href: "/fragrance-beauty/fragrances/men/beard-oil", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 4 },
              { id: "fragrance-beauty.fragrances.men.gift-set", label: "GIFT SET", href: "/fragrance-beauty/fragrances/men/gift-set", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 5 },
              { id: "fragrance-beauty.fragrances.men.body-spray", label: "BODY SPRAY", href: "/fragrance-beauty/fragrances/men/body-spray", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 6 },
            ],
          },
          {
            id: "fragrance-beauty.fragrances.women",
            label: "WOMEN",
            order: 2,
            items: [
              { id: "fragrance-beauty.fragrances.women.perfume", label: "PERFUME", href: "/fragrance-beauty/fragrances/women/perfume", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "fragrance-beauty.fragrances.women.miniature", label: "MINIATURE", href: "/fragrance-beauty/fragrances/women/miniature", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "fragrance-beauty.fragrances.women.body-mist", label: "BODY MIST", href: "/fragrance-beauty/fragrances/women/body-mist", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
              { id: "fragrance-beauty.fragrances.women.gift-set", label: "GIFT SET", href: "/fragrance-beauty/fragrances/women/gift-set", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 4 },
              { id: "fragrance-beauty.fragrances.women.body-spray", label: "BODY SPRAY", href: "/fragrance-beauty/fragrances/women/body-spray", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 5 },
            ],
          },
          {
            id: "fragrance-beauty.fragrances.others",
            label: "OTHERS",
            order: 3,
            items: [
              { id: "fragrance-beauty.fragrances.others.aroma-oil-diffusers", label: "AROMA OIL & DIFFUSERS", href: "/fragrance-beauty/fragrances/others/aroma-oil-diffusers", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "fragrance-beauty.fragrances.others.air-freshener", label: "AIR FRESHENER", href: "/fragrance-beauty/fragrances/others/air-freshener", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "fragrance-beauty.fragrances.others.bakhoor", label: "BAKHOOR", href: "/fragrance-beauty/fragrances/others/bakhoor", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
              { id: "fragrance-beauty.fragrances.others.fragrant-shower-gel", label: "FRAGRANT SHOWER GEL", href: "/fragrance-beauty/fragrances/others/fragrant-shower-gel", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 4 },
              { id: "fragrance-beauty.fragrances.others.reed-diffuser", label: "REED DIFFUSER", href: "/fragrance-beauty/fragrances/others/reed-diffuser", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 5 },
              { id: "fragrance-beauty.fragrances.others.scented-candle", label: "SCENTED CANDLE", href: "/fragrance-beauty/fragrances/others/scented-candle", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 6 },
            ],
          },
        ],
        visualCards: [],
      },
      {
        id: "fragrance-beauty.makeup",
        label: "MAKEUP",
        href: "/fragrance-beauty/makeup",
        order: 3,
        groups: [
          {
            id: "fragrance-beauty.makeup.face",
            label: "FACE",
            order: 1,
            items: [
              { id: "fragrance-beauty.makeup.face.cream-foundation", label: "CREAM & FOUNDATION", href: "/fragrance-beauty/makeup/face/cream-foundation", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "fragrance-beauty.makeup.face.concealer-contour", label: "CONCEALER & CONTOUR", href: "/fragrance-beauty/makeup/face/concealer-contour", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "fragrance-beauty.makeup.face.face-powder", label: "FACE POWDER", href: "/fragrance-beauty/makeup/face/face-powder", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
              { id: "fragrance-beauty.makeup.face.blush-highlight", label: "BLUSH & HIGHLIGHT", href: "/fragrance-beauty/makeup/face/blush-highlight", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 4 },
            ],
          },
          {
            id: "fragrance-beauty.makeup.eyes",
            label: "EYES",
            order: 2,
            items: [
              { id: "fragrance-beauty.makeup.eyes.eye-liner-mascara", label: "EYE LINER & MASCARA", href: "/fragrance-beauty/makeup/eyes/eye-liner-mascara", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "fragrance-beauty.makeup.eyes.eye-shadow", label: "EYE SHADOW", href: "/fragrance-beauty/makeup/eyes/eye-shadow", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "fragrance-beauty.makeup.eyes.eye-pencil", label: "EYE PENCIL", href: "/fragrance-beauty/makeup/eyes/eye-pencil", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
              { id: "fragrance-beauty.makeup.eyes.eyebrow", label: "EYEBROW", href: "/fragrance-beauty/makeup/eyes/eyebrow", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 4 },
            ],
          },
          {
            id: "fragrance-beauty.makeup.lips",
            label: "LIPS",
            order: 3,
            items: [
              { id: "fragrance-beauty.makeup.lips.lipstick", label: "LIPSTICK", href: "/fragrance-beauty/makeup/lips/lipstick", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "fragrance-beauty.makeup.lips.lip-gloss", label: "LIP GLOSS", href: "/fragrance-beauty/makeup/lips/lip-gloss", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "fragrance-beauty.makeup.lips.lip-care", label: "LIP CARE", href: "/fragrance-beauty/makeup/lips/lip-care", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
              { id: "fragrance-beauty.makeup.lips.lip-pencil", label: "LIP PENCIL", href: "/fragrance-beauty/makeup/lips/lip-pencil", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 4 },
            ],
          },
          {
            id: "fragrance-beauty.makeup.accessories",
            label: "ACCESSORIES",
            order: 4,
            items: [
              { id: "fragrance-beauty.makeup.accessories.blender-sponge", label: "BLENDER & SPONGE", href: "/fragrance-beauty/makeup/accessories/blender-sponge", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "fragrance-beauty.makeup.accessories.sharpener", label: "SHARPENER", href: "/fragrance-beauty/makeup/accessories/sharpener", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
            ],
          },
        ],
        visualCards: [],
      },
      {
        id: "fragrance-beauty.skincare",
        label: "SKINCARE",
        href: "/fragrance-beauty/skincare",
        order: 4,
        groups: [
          {
            id: "fragrance-beauty.skincare.collection",
            label: "COLLECTION",
            order: 1,
            items: [
              { id: "fragrance-beauty.skincare.shower-gel", label: "SHOWER GEL", href: "/fragrance-beauty/skincare/shower-gel", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "fragrance-beauty.skincare.creams", label: "CREAMS", href: "/fragrance-beauty/skincare/creams", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "fragrance-beauty.skincare.toners", label: "TONERS", href: "/fragrance-beauty/skincare/toners", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
            ],
          },
          {
            id: "fragrance-beauty.skincare.shop-by-category",
            label: "SHOP BY CATEGORY",
            order: 2,
            items: [
              { id: "fragrance-beauty.skincare.face", label: "FACE", href: "/fragrance-beauty/skincare/face", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "fragrance-beauty.skincare.body-care", label: "BODY CARE", href: "/fragrance-beauty/skincare/body-care", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "fragrance-beauty.skincare.hair", label: "HAIR", href: "/fragrance-beauty/skincare/hair", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
              { id: "fragrance-beauty.skincare.hand-feet", label: "HAND & FEET", href: "/fragrance-beauty/skincare/hand-feet", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 4 },
            ],
          },
        ],
        visualCards: [],
      },
    ],
  },
  {
    id: "teens",
    label: "TEENS",
    order: 4,
    visualCards: [
      {
        id: "teens.card.new-in",
        label: "NEW IN",
        href: "/teens/new-in",
        image: "/images/fabrics/hero_fabric_summer_1780065728421.png",
        badge: null,
        comingSoon: false,
        visibility: "visible",
        status: "active",
        order: 1,
      },
      {
        id: "teens.card.teen-girls",
        label: "TEEN GIRLS",
        href: "/teens/teen-girls",
        image: "/images/fabrics/cat_cotton_1776582727723.png",
        badge: null,
        comingSoon: false,
        visibility: "visible",
        status: "active",
        order: 2,
      },
      {
        id: "teens.card.teen-boys",
        label: "TEEN BOYS",
        href: "/teens/teen-boys",
        image: "/images/fabrics/cat_wool_1776583171222.png",
        badge: null,
        comingSoon: false,
        visibility: "visible",
        status: "active",
        order: 3,
      },
    ],
    sections: [
      {
        id: "teens.new-in",
        label: "NEW IN",
        href: "/teens/new-in",
        order: 1,
        groups: [
          {
            id: "teens.new-in.shop-by-category",
            label: "SHOP BY CATEGORY",
            order: 1,
            items: [
              { id: "teens.new-in.teen-girls", label: "TEEN GIRLS", href: "/teens/new-in/teen-girls", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "teens.new-in.teen-boys", label: "TEEN BOYS", href: "/teens/new-in/teen-boys", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
            ],
          },
        ],
        visualCards: [],
      },
      {
        id: "teens.teen-girls",
        label: "TEEN GIRLS",
        href: "/teens/teen-girls",
        order: 2,
        groups: [
          {
            id: "teens.teen-girls.shop-by-collection",
            label: "SHOP BY COLLECTION",
            order: 1,
            items: [
              { id: "teens.teen-girls.summer-26", label: "SUMMER'26", href: "/teens/teen-girls/summer-26", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
            ],
          },
          {
            id: "teens.teen-girls.shop-by-category",
            label: "SHOP BY CATEGORY",
            order: 2,
            items: [
              { id: "teens.teen-girls.ready-to-wear", label: "READY TO WEAR", href: "/teens/teen-girls/ready-to-wear", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "teens.teen-girls.kurti", label: "KURTI", href: "/teens/teen-girls/kurti", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "teens.teen-girls.trousers", label: "TROUSERS", href: "/teens/teen-girls/trousers", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
              { id: "teens.teen-girls.essentials", label: "ESSENTIALS", href: "/teens/teen-girls/essentials", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 4 },
            ],
          },
          {
            id: "teens.teen-girls.shop-by-occasion",
            label: "SHOP BY OCCASION",
            order: 3,
            items: [
              { id: "teens.teen-girls.casual", label: "CASUAL", href: "/teens/teen-girls/casual", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "teens.teen-girls.occasion-wear", label: "PARTY & OCCASION WEAR", href: "/teens/teen-girls/occasion-wear", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
            ],
          },
        ],
        visualCards: [],
      },
      {
        id: "teens.teen-boys",
        label: "TEEN BOYS",
        href: "/teens/teen-boys",
        order: 3,
        groups: [
          {
            id: "teens.teen-boys.shop-by-collection",
            label: "SHOP BY COLLECTION",
            order: 1,
            items: [
              { id: "teens.teen-boys.summer-26", label: "SUMMER'26", href: "/teens/teen-boys/summer-26", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
            ],
          },
          {
            id: "teens.teen-boys.shop-by-category",
            label: "SHOP BY CATEGORY",
            order: 2,
            items: [
              { id: "teens.teen-boys.kameez-shalwar", label: "KAMEEZ SHALWAR", href: "/teens/teen-boys/kameez-shalwar", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "teens.teen-boys.kurta", label: "KURTA", href: "/teens/teen-boys/kurta", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
              { id: "teens.teen-boys.special-kurta", label: "SPECIAL KURTA", href: "/teens/teen-boys/special-kurta", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 3 },
              { id: "teens.teen-boys.jubba-thobe", label: "JUBBA-THOBE", href: "/teens/teen-boys/jubba-thobe", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 4 },
              { id: "teens.teen-boys.bottom-wear", label: "BOTTOM WEAR", href: "/teens/teen-boys/bottom-wear", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 5 },
            ],
          },
          {
            id: "teens.teen-boys.shop-by-occasion",
            label: "SHOP BY OCCASION",
            order: 3,
            items: [
              { id: "teens.teen-boys.casual", label: "CASUAL", href: "/teens/teen-boys/casual", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 1 },
              { id: "teens.teen-boys.occasion-wear", label: "PARTY & OCCASION WEAR", href: "/teens/teen-boys/occasion-wear", image: null, badge: null, comingSoon: false, visibility: "visible", status: "active", order: 2 },
            ],
          },
        ],
        visualCards: [],
      },
      {
        id: "teens.sale",
        label: "SALE",
        href: "/teens/sale",
        order: 4,
        groups: [],
        visualCards: [],
      },
    ],
  },
];

type OrderedEntry = {
  order: number;
};

type VisibleOrderedEntry = OrderedEntry & {
  visibility: MenuVisibility;
};

export function sortByMenuOrder<T extends OrderedEntry>(entries: readonly T[]): T[] {
  return [...entries].sort((left, right) => left.order - right.order);
}

export function getVisibleMenuEntries<T extends VisibleOrderedEntry>(
  entries: readonly T[],
): T[] {
  return sortByMenuOrder(entries.filter((entry) => entry.visibility === "visible"));
}

export function resolveMenuVisualCards(
  department: MenuDepartment,
  section: MenuSection,
): MenuVisualCard[] {
  const sectionCards = getVisibleMenuEntries(section.visualCards);

  return sectionCards.length > 0
    ? sectionCards
    : getVisibleMenuEntries(department.visualCards);
}

export type MenuLeafRouteRole =
  | "canonical-descendant"
  | "navigation-reference"
  | "invalid";

/**
 * A routed menu item owns a structural leaf only when its most-specific
 * section ancestor is the section rendering it. Equal-section links and
 * links into another configured section are presentation references to the
 * canonical node at that destination.
 */
export function resolveMenuLeafRouteRole(
  itemHref: string,
  currentSectionHref: string,
  departmentSectionHrefs: readonly string[],
): MenuLeafRouteRole {
  const owningSectionHref = departmentSectionHrefs
    .filter(
      (sectionHref) =>
        itemHref === sectionHref || itemHref.startsWith(`${sectionHref}/`),
    )
    .sort((left, right) => right.length - left.length)[0];

  if (!owningSectionHref) return "invalid";
  if (
    itemHref === currentSectionHref ||
    owningSectionHref !== currentSectionHref
  ) {
    return "navigation-reference";
  }
  return "canonical-descendant";
}
