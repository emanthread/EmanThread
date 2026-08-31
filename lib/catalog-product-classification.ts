import type { ProductKind, ProductOptionType } from "@/lib/data";
import { isValidHexColor } from "@/lib/color-hex";

export type CatalogProductClassification = {
  productKind: ProductKind;
  label: string;
  editorSchema: ProductEditorSchema;
  compatibilityCategoryName: string;
  suggestedTags: readonly string[];
};

export type ProductEditorFieldMode = "hidden" | "optional" | "required";

export type ProductEditorFieldSchema = {
  mode: ProductEditorFieldMode;
  label: string;
};

export type ProductOptionPreset = {
  optionKey: string;
  label: string;
};

export type ProductEditorSchema = {
  fields: {
    fabric: ProductEditorFieldSchema;
    color: ProductEditorFieldSchema;
    sizeGuide: ProductEditorFieldSchema & { placeholder: string };
    stitching: ProductEditorFieldSchema;
  };
  inventorySource: "product" | "variant";
  optionAxes: {
    required: readonly ProductOptionType[];
    optional: readonly ProductOptionType[];
  };
  options: {
    mode: "optional" | "required";
    label: string;
    itemPlaceholder: string;
    presets: readonly ProductOptionPreset[];
  };
};

const APPAREL_SIZE_PRESETS: readonly ProductOptionPreset[] = [
  { optionKey: "xs", label: "XS" },
  { optionKey: "s", label: "S" },
  { optionKey: "m", label: "M" },
  { optionKey: "l", label: "L" },
  { optionKey: "xl", label: "XL" },
  { optionKey: "xxl", label: "XXL" },
];

const hiddenField = (label: string): ProductEditorFieldSchema => ({
  mode: "hidden",
  label,
});

const hiddenSizeGuide = {
  mode: "hidden",
  label: "Size guide URL",
  placeholder: "/size-guide or https://…",
} as const;

const CLASSIFICATIONS: Record<ProductKind, Omit<CatalogProductClassification, "productKind">> = {
  UNSTITCHED_FABRIC: {
    label: "Unstitched fabric",
    editorSchema: {
      fields: {
        fabric: { mode: "required", label: "Fabric / material" },
        color: { mode: "required", label: "Color" },
        sizeGuide: hiddenSizeGuide,
        stitching: { mode: "optional", label: "Custom stitching" },
      },
      inventorySource: "product",
      optionAxes: { required: [], optional: ["COLOR"] },
      options: {
        mode: "optional",
        label: "Option",
        itemPlaceholder: "2-piece",
        presets: [],
      },
    },
    compatibilityCategoryName: "Unstitched",
    suggestedTags: ["Summer", "Winter", "All Season", "Festive", "Formal", "Premium"],
  },
  READY_TO_WEAR: {
    label: "Ready to wear",
    editorSchema: {
      fields: {
        fabric: { mode: "optional", label: "Fabric / material" },
        color: { mode: "required", label: "Color" },
        sizeGuide: {
          mode: "optional",
          label: "Size guide URL",
          placeholder: "/size-guide or https://…",
        },
        stitching: hiddenField("Custom stitching"),
      },
      inventorySource: "variant",
      optionAxes: { required: ["SIZE"], optional: ["COLOR"] },
      options: {
        mode: "required",
        label: "Size",
        itemPlaceholder: "Medium",
        presets: APPAREL_SIZE_PRESETS,
      },
    },
    compatibilityCategoryName: "Ready to Wear",
    suggestedTags: ["Casual", "Formal", "Festive", "Wedding", "Eid", "Premium"],
  },
  FRAGRANCE: {
    label: "Fragrance",
    editorSchema: {
      fields: {
        fabric: hiddenField("Fabric / material"),
        color: hiddenField("Color"),
        sizeGuide: hiddenSizeGuide,
        stitching: hiddenField("Custom stitching"),
      },
      inventorySource: "product",
      optionAxes: { required: [], optional: ["VOLUME"] },
      options: {
        mode: "optional",
        label: "Volume",
        itemPlaceholder: "50 ml",
        presets: [],
      },
    },
    compatibilityCategoryName: "Fragrance & Beauty",
    suggestedTags: ["For Him", "For Her", "Unisex", "Fresh", "Woody", "Floral", "Giftable"],
  },
  BEAUTY: {
    label: "Beauty",
    editorSchema: {
      fields: {
        fabric: hiddenField("Fabric / material"),
        color: hiddenField("Shade / color"),
        sizeGuide: hiddenSizeGuide,
        stitching: hiddenField("Custom stitching"),
      },
      inventorySource: "product",
      optionAxes: { required: [], optional: [] },
      options: {
        mode: "optional",
        label: "Shade / option",
        itemPlaceholder: "Rosewood",
        presets: [],
      },
    },
    compatibilityCategoryName: "Fragrance & Beauty",
    suggestedTags: ["Makeup", "Skincare", "Everyday", "Premium", "Giftable"],
  },
  TEENS: {
    label: "Teens",
    editorSchema: {
      fields: {
        fabric: { mode: "optional", label: "Fabric / material" },
        color: { mode: "required", label: "Color" },
        sizeGuide: {
          mode: "optional",
          label: "Size guide URL",
          placeholder: "/size-guide or https://…",
        },
        stitching: hiddenField("Custom stitching"),
      },
      inventorySource: "variant",
      optionAxes: { required: ["SIZE"], optional: ["COLOR"] },
      options: {
        mode: "required",
        label: "Size",
        itemPlaceholder: "Medium",
        presets: APPAREL_SIZE_PRESETS,
      },
    },
    compatibilityCategoryName: "Teens",
    suggestedTags: ["Teen Girls", "Teen Boys", "Casual", "Festive", "Summer"],
  },
  GIFT: {
    label: "Gift",
    editorSchema: {
      fields: {
        fabric: hiddenField("Fabric / material"),
        color: hiddenField("Color"),
        sizeGuide: hiddenSizeGuide,
        stitching: hiddenField("Custom stitching"),
      },
      inventorySource: "product",
      optionAxes: { required: [], optional: ["FORMAT", "STYLE", "CUSTOM"] },
      options: {
        mode: "optional",
        label: "Gift option",
        itemPlaceholder: "Standard",
        presets: [],
      },
    },
    compatibilityCategoryName: "Gifts",
    suggestedTags: ["Giftable", "Wedding", "Eid", "Premium", "Limited"],
  },
  GIFT_BOX: {
    label: "Gift box",
    editorSchema: {
      fields: {
        fabric: hiddenField("Fabric / material"),
        color: hiddenField("Color"),
        sizeGuide: hiddenSizeGuide,
        stitching: hiddenField("Custom stitching"),
      },
      inventorySource: "product",
      optionAxes: { required: [], optional: ["FORMAT", "STYLE", "CUSTOM"] },
      options: {
        mode: "optional",
        label: "Gift option",
        itemPlaceholder: "Standard",
        presets: [],
      },
    },
    compatibilityCategoryName: "Gifts",
    suggestedTags: ["Gift Box", "Giftable", "Wedding", "Eid", "Premium"],
  },
  ACCESSORY: {
    label: "Accessory",
    editorSchema: {
      fields: {
        fabric: hiddenField("Fabric / material"),
        color: hiddenField("Color"),
        sizeGuide: hiddenSizeGuide,
        stitching: hiddenField("Custom stitching"),
      },
      inventorySource: "product",
      optionAxes: { required: [], optional: ["COLOR", "SIZE", "STYLE", "FORMAT", "CUSTOM"] },
      options: {
        mode: "optional",
        label: "Option",
        itemPlaceholder: "Standard",
        presets: [],
      },
    },
    compatibilityCategoryName: "Accessories",
    suggestedTags: ["Accessory", "Everyday", "Premium", "Giftable"],
  },
};

export const PRODUCT_KIND_OPTIONS: ReadonlyArray<{
  value: ProductKind;
  label: string;
}> = (Object.keys(CLASSIFICATIONS) as ProductKind[]).map((value) => ({
  value,
  label: CLASSIFICATIONS[value].label,
}));

function withKind(productKind: ProductKind): CatalogProductClassification {
  return { productKind, ...CLASSIFICATIONS[productKind] };
}

export function classificationForProductKind(
  productKind: ProductKind
): CatalogProductClassification {
  return withKind(productKind);
}

function isMakeupPath(path: string): boolean {
  return path.includes("/makeup") && !path.includes("/makeup/accessories");
}

/**
 * Legacy migration adapter. Product behavior now lives on CatalogNode as a
 * typed productKind; this resolver keeps older/unmigrated nodes usable and is
 * also used by the one-time database backfill.
 */
export function classifyCatalogPath(
  rawPath: string | null | undefined
): CatalogProductClassification | null {
  if (!rawPath) return null;
  const path = rawPath.trim().toLocaleLowerCase("en-US");
  if (!path.startsWith("/")) return null;

  // Department, generic "new in", and sale landing pages mix multiple kinds;
  // they are merchandising destinations, not valid primary classifications.
  if (
    /^\/(women|men|teens|fragrance-beauty)$/.test(path) ||
    /^\/(women|men|teens|fragrance-beauty)\/(new-in|sale)$/.test(path)
  ) {
    return null;
  }

  let kind: ProductKind | null = null;

  if (path.includes("gift-box")) {
    kind = "GIFT_BOX";
  } else if (
    path.includes("/fragrances") ||
    path.includes("/perfume") ||
    path.includes("/attar") ||
    path.includes("body-mist") ||
    path.includes("body-spray") ||
    path.includes("bakhoor") ||
    path.includes("diffuser") ||
    path.includes("air-freshener") ||
    path.includes("scented-candle") ||
    path.startsWith("/fragrance-beauty/new-in/")
  ) {
    kind = "FRAGRANCE";
  } else if (path.includes("/makeup/accessories")) {
    kind = "ACCESSORY";
  } else if (path.includes("/makeup") || path.includes("/skincare")) {
    kind = "BEAUTY";
  } else if (path.includes("gift")) {
    kind = "GIFT";
  } else if (path.includes("accessor")) {
    kind = "ACCESSORY";
  } else if (
    path.startsWith("/women/partywear") ||
    path.startsWith("/women/bridal-wear")
  ) {
    // Legacy root URLs were sold as fabric with optional stitching. Keep that
    // behavior for existing products/bookmarks; the canonical nested RTW and
    // Unstitched destinations classify from their explicit parent path below.
    kind = "UNSTITCHED_FABRIC";
  } else if (path.includes("unstitched")) {
    kind = "UNSTITCHED_FABRIC";
  } else if (path.startsWith("/teens")) {
    kind = "TEENS";
  } else if (
    path.includes("ready-to-wear") ||
    path.includes("/rtw-") ||
    path.includes("/cast-crew/clothing") ||
    path.startsWith("/women/") ||
    path.startsWith("/men/")
  ) {
    kind = "READY_TO_WEAR";
  }

  if (!kind) return null;
  const classification = withKind(kind);

  // Makeup can use shade/color information; skincare should not inherit it.
  if (kind === "BEAUTY" && isMakeupPath(path)) {
    return {
      ...classification,
      editorSchema: {
        ...classification.editorSchema,
        optionAxes: { required: [], optional: ["SHADE"] },
        fields: {
          ...classification.editorSchema.fields,
          color: { mode: "optional", label: "Shade / color" },
        },
      },
      suggestedTags: ["Makeup", "Everyday", "Long Wear", "Matte", "Glow", "Premium"],
    };
  }

  return classification;
}

/**
 * Resolve a catalog node using stable metadata first. Path inspection only
 * adds the makeup-specific shade treatment or supports an unmigrated node.
 */
export function classifyCatalogNode(node: {
  path?: string | null;
  productKind?: ProductKind | null;
} | null | undefined): CatalogProductClassification | null {
  if (!node) return null;
  const legacyClassification = classifyCatalogPath(node.path);
  // Undefined means an older caller did not supply the new field. Null is an
  // explicit mixed/landing-page classification and must never be guessed.
  if (node.productKind === undefined) return legacyClassification;
  if (node.productKind === null) return null;

  const classification = withKind(node.productKind);
  if (
    node.productKind === "BEAUTY" &&
    legacyClassification?.productKind === "BEAUTY" &&
    legacyClassification.editorSchema.fields.color.mode !== "hidden"
  ) {
    return {
      ...classification,
      editorSchema: {
        ...classification.editorSchema,
        optionAxes: legacyClassification.editorSchema.optionAxes,
        fields: {
          ...classification.editorSchema.fields,
          color: legacyClassification.editorSchema.fields.color,
        },
      },
      suggestedTags: legacyClassification.suggestedTags,
    };
  }
  return classification;
}

export function defaultOptionLabelForKind(kind: ProductKind): string {
  return CLASSIFICATIONS[kind].editorSchema.options.label;
}

export function productEditorSchemaForKind(
  kind: ProductKind
): ProductEditorSchema {
  return CLASSIFICATIONS[kind].editorSchema;
}

export function isProductEditorFieldVisible(
  field: ProductEditorFieldSchema
): boolean {
  return field.mode !== "hidden";
}

export function isProductEditorFieldRequired(
  field: ProductEditorFieldSchema
): boolean {
  return field.mode === "required";
}

/**
 * While either half of the catalog/commerce rollout is disabled, the enabled
 * half may preserve an established product kind but must not change it alone.
 * A product with no established kind remains the legacy unstitched behavior.
 */
export function canSaveProductKindWithoutCompanionFeature(
  existingProductKind: ProductKind | null | undefined,
  nextProductKind: ProductKind
): boolean {
  return existingProductKind
    ? existingProductKind === nextProductKind
    : nextProductKind === "UNSTITCHED_FABRIC";
}

export function defaultCommerceSettingsForClassification(
  classification: CatalogProductClassification
) {
  return {
    productKind: classification.productKind,
    stitchingEligible:
      classification.editorSchema.fields.stitching.mode !== "hidden",
    requiresSelection: classification.editorSchema.options.mode === "required",
    optionLabel: classification.editorSchema.options.label,
  };
}

export function humanizeCatalogSegment(segment: string): string {
  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function catalogPathBreadcrumb(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map(humanizeCatalogSegment)
    .join(" → ");
}

export function normalizeCatalogCompatibilityFields(
  classification: CatalogProductClassification,
  fields: { fabricType: string; color: string; colorHex: string }
) {
  const fabricType = isProductEditorFieldVisible(
    classification.editorSchema.fields.fabric
  )
    ? fields.fabricType.trim()
    : "";
  const color = isProductEditorFieldVisible(
    classification.editorSchema.fields.color
  )
    ? fields.color.trim()
    : "";
  const colorHex = color && isValidHexColor(fields.colorHex)
    ? fields.colorHex.trim()
    : "";

  return { fabricType, color, colorHex };
}

export function compatibilityCategoryName(
  classification: CatalogProductClassification,
  fabricType?: string
): string {
  if (classification.productKind === "UNSTITCHED_FABRIC" && fabricType?.trim()) {
    return humanizeCatalogSegment(fabricType.trim().replace(/_/g, "-"));
  }
  return classification.compatibilityCategoryName;
}
