import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { requireAdminApiAccess } from "@/lib/admin-route-guard";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import {
  canSaveProductKindWithoutCompanionFeature,
  classifyCatalogNode,
  compatibilityCategoryName,
  isProductEditorFieldRequired,
  normalizeCatalogCompatibilityFields,
  productEditorSchemaForKind,
} from "@/lib/catalog-product-classification";
import { parseProductImages } from "@/lib/utils/parse-images";
import {
  ARCHIVED_PRODUCT_TAG,
  visibleProductTags,
} from "@/lib/product-archive";
import { sanitizeDbError } from "@/lib/utils/errors";
import { isValidHexColor } from "@/lib/color-hex";
import {
  createAutomaticProductSku,
  createAutomaticVariantSku,
} from "@/lib/product-sku";

export const dynamic = "force-dynamic";

const recordIdSchema = z.string().trim().min(1).max(128);
const productKindSchema = z.enum([
  "UNSTITCHED_FABRIC",
  "READY_TO_WEAR",
  "FRAGRANCE",
  "BEAUTY",
  "TEENS",
  "GIFT",
  "GIFT_BOX",
  "ACCESSORY",
]);

const safeMediaUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2_048)
  .refine(
    (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
    "Media URLs must begin with /, http://, or https://"
  );

const productSchema = z
  .object({
    sku: z.string().trim().max(120).optional().default(""),
    slug: z
      .string()
      .trim()
      .max(180)
      .refine(
        (value) => !value || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
        "URL slug may use lowercase letters, numbers, and single hyphens only"
      )
      .optional(),
    name: z.string().trim().min(1, "Product name is required").max(240),
    description: z.string().trim().min(1, "Short description is required").max(1_000),
    longDescription: z.string().max(20_000).optional(),
    price: z.number().positive("Price must be greater than 0"),
    originalPrice: z.number().positive().optional(),
    fabricType: z.string().trim().max(160).default(""),
    color: z.string().trim().max(160).default(""),
    colorHex: z.string().trim().max(20).default(""),
    images: z.array(safeMediaUrlSchema).min(1).max(12),
    videoUrl: safeMediaUrlSchema.optional(),
    tags: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
    badge: z.enum(["NEW", "TRENDING", "HOT", "LIMITED", "FEATURED"]).optional(),
    inStock: z.boolean(),
    stockQuantity: z.number().int().min(0).max(10_000_000),
    lowStockThreshold: z.number().int().min(1).max(10_000_000),
    metaTitle: z.string().trim().max(240).optional(),
    metaDescription: z.string().trim().max(1_000).optional(),
    categoryId: recordIdSchema.optional(),
  })
  .superRefine((product, context) => {
    if (product.originalPrice !== undefined && product.originalPrice <= product.price) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["originalPrice"],
        message: "Compare-at price must be greater than the selling price",
      });
    }
  });

const assignmentSchema = z.object({
  catalogNodeId: recordIdSchema,
  isFeatured: z.boolean(),
  displayOrder: z.number().int().min(0).max(1_000_000).nullable(),
});

const detailSchema = z.object({
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(500),
});

const optionTypeSchema = z.enum([
  "COLOR", "SIZE", "SHADE", "VOLUME", "STYLE", "FORMAT", "CUSTOM",
]);

const optionValueSchema = z.object({
  id: recordIdSchema.optional(),
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  swatchHex: z.string().trim().max(20).optional(),
  images: z.array(safeMediaUrlSchema).max(10).default([]),
  isActive: z.boolean().default(true),
});

const optionAxisSchema = z.object({
  id: recordIdSchema.optional(),
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(60),
  type: optionTypeSchema,
  isRequired: z.boolean().default(true),
  values: z.array(optionValueSchema).min(1).max(40),
});

const variantSchema = z.object({
  id: recordIdSchema.optional(),
  optionKey: z.string().trim().min(1).max(400),
  label: z.string().trim().min(1).max(120),
  sku: z.string().trim().max(120).optional(),
  priceAdjustment: z.number().min(-1_000_000).max(1_000_000),
  stockQuantity: z.number().int().min(0).max(10_000_000),
  inStock: z.boolean(),
  isActive: z.boolean(),
  colorHex: z.string().trim().max(20).optional(),
  images: z.array(safeMediaUrlSchema).max(10).default([]),
  selections: z.array(z.object({
    optionKey: z.string().trim().min(1).max(80),
    valueKey: z.string().trim().min(1).max(80),
  })).max(4).optional(),
});

const commerceProfileSchema = z
  .object({
    productKind: productKindSchema,
    stitchingEligible: z.boolean(),
    requiresSelection: z.boolean(),
    optionLabel: z.string().trim().max(60).optional(),
    sizeGuideUrl: z.string().trim().max(2_048).optional(),
    details: z.array(detailSchema).max(12),
    options: z.array(optionAxisSchema).max(4).optional(),
    variants: z.array(variantSchema).max(300),
  })
  .superRefine((profile, context) => {
    const optionKeys = new Set<string>();
    const skus = new Set<string>();
    const variantIds = new Set<string>();
    const axes = profile.options || [];
    const axisKeys = new Set<string>();
    const visualAxes = axes.filter((axis) => axis.type === "COLOR" || axis.type === "SHADE");
    axes.forEach((axis, axisIndex) => {
      const axisKey = axis.key.toLocaleLowerCase("en-US");
      if (axisKeys.has(axisKey)) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["options", axisIndex, "key"], message: "Each option axis must be unique" });
      }
      axisKeys.add(axisKey);
      const valueKeys = new Set<string>();
      axis.values.forEach((value, valueIndex) => {
        const key = value.key.toLocaleLowerCase("en-US");
        if (valueKeys.has(key)) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: ["options", axisIndex, "values", valueIndex, "key"], message: "Each value in an option must be unique" });
        }
        valueKeys.add(key);
        if ((axis.type === "COLOR" || axis.type === "SHADE") && !/^#[0-9a-f]{6}$/i.test(value.swatchHex || "")) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: ["options", axisIndex, "values", valueIndex, "swatchHex"], message: "Colors and shades need a valid swatch" });
        }
      });
    });
    if (visualAxes.length > 1) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "Use only one visual Color or Shade axis" });
    }
    const combinations = new Set<string>();
    if (
      (profile.requiresSelection || profile.variants.length > 0) &&
      !profile.optionLabel?.trim()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["optionLabel"],
        message: "Enter a name for the product options",
      });
    }
    if (
      profile.sizeGuideUrl &&
      !profile.sizeGuideUrl.startsWith("/") &&
      !/^https?:\/\//i.test(profile.sizeGuideUrl)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sizeGuideUrl"],
        message: "Size guide URL must begin with /, http://, or https://",
      });
    }
    profile.variants.forEach((variant, index) => {
      if (variant.id && variantIds.has(variant.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants", index, "id"],
          message: "Each saved option can appear only once",
        });
      }
      if (variant.id) variantIds.add(variant.id);
      const key = variant.optionKey.toLocaleLowerCase("en-US");
      if (optionKeys.has(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants", index, "optionKey"],
          message: "Each option label must be unique",
        });
      }
      optionKeys.add(key);
      const sku = variant.sku?.toLocaleLowerCase("en-US");
      if (sku && skus.has(sku)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants", index, "sku"],
          message: "Each option SKU must be unique",
        });
      }
      if (sku) skus.add(sku);

      if (axes.length > 0) {
        const selections = variant.selections || [];
        if (selections.length !== axes.length) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: ["variants", index, "selections"], message: "Each SKU must select exactly one value from every option axis" });
        }
        const byAxis = new Map(selections.map((selection) => [selection.optionKey.toLocaleLowerCase("en-US"), selection.valueKey.toLocaleLowerCase("en-US")]));
        const combination = axes.map((axis) => {
          const valueKey = byAxis.get(axis.key.toLocaleLowerCase("en-US"));
          const valid = axis.values.some((value) => value.key.toLocaleLowerCase("en-US") === valueKey);
          if (!valid) {
            context.addIssue({ code: z.ZodIssueCode.custom, path: ["variants", index, "selections"], message: `Choose a valid ${axis.label}` });
          }
          return `${axis.key.toLocaleLowerCase("en-US")}:${valueKey || ""}`;
        }).join("|");
        if (combinations.has(combination)) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: ["variants", index, "selections"], message: "Each option combination must be unique" });
        }
        combinations.add(combination);
      }

      if (axes.length === 0 && profile.productKind === "UNSTITCHED_FABRIC") {
        if (!/^#[0-9a-f]{6}$/i.test(variant.colorHex || "")) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["variants", index, "colorHex"],
            message: `Color ${index + 1} needs a valid swatch color`,
          });
        }
        if (variant.images.length === 0) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["variants", index, "images"],
            message: `Color ${index + 1} needs at least one image`,
          });
        }
      } else if (axes.length === 0 && (variant.colorHex || variant.images.length > 0)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants", index],
          message: "Per-color galleries are currently available only for unstitched fabric",
        });
      }
    });

    if (
      axes.length === 0 && profile.productKind === "UNSTITCHED_FABRIC" &&
      profile.variants.length > 0 &&
      profile.optionLabel?.trim().toLocaleLowerCase("en-US") !== "color"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["optionLabel"],
        message: "Unstitched selling options must be colors",
      });
    }
  });

const editorSchema = z
  .object({
    productId: recordIdSchema.optional(),
    expectedUpdatedAt: z.string().datetime().optional(),
    product: productSchema,
    assignments: z.array(assignmentSchema).max(25).optional(),
    commerceProfile: commerceProfileSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.productId && !value.expectedUpdatedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expectedUpdatedAt"],
        message: "Reload this product before saving",
      });
    }
    if (value.assignments) {
      const nodeIds = new Set<string>();
      value.assignments.forEach((assignment, index) => {
        if (nodeIds.has(assignment.catalogNodeId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["assignments", index, "catalogNodeId"],
            message: "Each catalog category can be used only once",
          });
        }
        nodeIds.add(assignment.catalogNodeId);
      });
    }
    value.commerceProfile?.variants.forEach((variant, index) => {
      if (value.product.price + variant.priceAdjustment <= 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["commerceProfile", "variants", index, "priceAdjustment"],
          message: "An option's final price must be greater than 0",
        });
      }
    });
  });

class ProductEditorError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409 = 400
  ) {
    super(message);
    this.name = "ProductEditorError";
  }
}

function slugFromSku(sku: string): string {
  return sku
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function serializeProduct(product: {
  id: string;
  name: string;
  sku: string;
  slug: string | null;
  price: unknown;
  originalPrice: unknown | null;
  fabricType: string;
  color: string;
  colorHex: string;
  images: string;
  videoUrl: string | null;
  badge: string | null;
  inStock: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  description: string;
  longDescription: string | null;
  categoryId: string;
  tags: string;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const badgeLabels: Record<string, string> = {
    NEW: "New",
    TRENDING: "Trending",
    HOT: "Hot",
    LIMITED: "Limited",
    FEATURED: "Featured",
  };
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    slug: product.slug || slugFromSku(product.sku),
    price: Number(product.price),
    originalPrice:
      product.originalPrice === null ? undefined : Number(product.originalPrice),
    fabricType: product.fabricType,
    color: product.color,
    colorHex: product.colorHex,
    images: parseProductImages(product.images),
    videoUrl: product.videoUrl || undefined,
    badge: product.badge ? badgeLabels[product.badge] : undefined,
    inStock: product.inStock,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
    description: product.description,
    longDescription: product.longDescription || "",
    categoryId: product.categoryId,
    tags: visibleProductTags(product.tags),
    metaTitle: product.metaTitle || undefined,
    metaDescription: product.metaDescription || undefined,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export const POST = withLoggedAdminHandler(async (request: Request) => {
  const access = await requireAdminApiAccess(request);
  if (!access.ok) return access.response;

  const parsed = editorSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.errors[0];
    return NextResponse.json(
      {
        error: issue?.message || "Invalid product",
        field: issue?.path.join(".") || undefined,
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const isEdit = Boolean(input.productId);

  try {
    const saved = await prisma.$transaction(
      async (tx) => {
        const existing = input.productId
          ? await tx.product.findUnique({ where: { id: input.productId } })
          : null;
        const existingCommerceProfile =
          existing &&
          (FEATURE_FLAGS.COMMERCE_PROFILE_V1 ||
            FEATURE_FLAGS.CATALOG_ADMIN_ASSIGNMENTS_V1)
              ? await tx.productCommerceProfile.findUnique({
                where: { productId: existing.id },
                include: { options: { include: { values: true } }, variants: true },
              })
            : null;
        const existingCatalogAssignments =
          existing && FEATURE_FLAGS.CATALOG_ADMIN_ASSIGNMENTS_V1
            ? await tx.productCatalogAssignment.findMany({
                where: { productId: existing.id },
                select: {
                  catalogNodeId: true,
                  isPrimary: true,
                  isFeatured: true,
                  displayOrder: true,
                  catalogNode: { select: { productKind: true } },
                },
              })
            : [];
        if (input.productId && !existing) {
          throw new ProductEditorError("Product not found", 404);
        }
        if (
          existing &&
          input.expectedUpdatedAt !== existing.updatedAt.toISOString()
        ) {
          throw new ProductEditorError(
            "This product changed after you opened it. Reload before saving so newer inventory or edits are not overwritten.",
            409
          );
        }

        if (input.assignments && !FEATURE_FLAGS.CATALOG_ADMIN_ASSIGNMENTS_V1) {
          throw new ProductEditorError("Catalog assignments are not enabled");
        }
        if (input.commerceProfile && !FEATURE_FLAGS.COMMERCE_PROFILE_V1) {
          throw new ProductEditorError("Selling options are not enabled");
        }

        const desiredAssignments = input.assignments;
        const nodeIds = desiredAssignments?.map((item) => item.catalogNodeId) || [];
        const nodes = nodeIds.length
          ? await tx.catalogNode.findMany({
              where: { id: { in: nodeIds } },
              select: {
                id: true,
                path: true,
                productKind: true,
                label: true,
                isActive: true,
                _count: { select: { children: true } },
              },
            })
          : [];
        if (nodes.length !== nodeIds.length) {
          throw new ProductEditorError("One or more product categories no longer exist", 409);
        }
        const nodesById = new Map(nodes.map((node) => [node.id, node]));
        const existingAssignmentsByNodeId = new Map(
          existingCatalogAssignments.map((assignment) => [
            assignment.catalogNodeId,
            assignment,
          ])
        );
        const changedInactiveAssignment = desiredAssignments?.find(
          (assignment, index) => {
            const node = nodesById.get(assignment.catalogNodeId);
            if (node?.isActive) return false;
            const previous = existingAssignmentsByNodeId.get(
              assignment.catalogNodeId
            );
            return (
              !previous ||
              previous.isPrimary !== (index === 0) ||
              previous.isFeatured !== assignment.isFeatured ||
              previous.displayOrder !== assignment.displayOrder
            );
          }
        );
        if (changedInactiveAssignment) {
          const inactiveNode = nodesById.get(
            changedInactiveAssignment.catalogNodeId
          );
          throw new ProductEditorError(
            `${inactiveNode?.label || "This category"} is inactive. Remove it or leave its settings unchanged.`,
            409
          );
        }
        const primaryNode = desiredAssignments?.[0]
          ? nodesById.get(desiredAssignments[0].catalogNodeId)
          : null;
        const classification = classifyCatalogNode(primaryNode);
        if (
          FEATURE_FLAGS.CATALOG_ADMIN_ASSIGNMENTS_V1 &&
          (!desiredAssignments?.length ||
            !classification ||
            !primaryNode?.isActive ||
            (primaryNode?._count.children || 0) > 0)
        ) {
          throw new ProductEditorError(
            "Choose a specific product category before saving"
          );
        }

        const submittedProductKind =
          classification?.productKind || input.commerceProfile?.productKind;
        const submittedVisualValue = input.commerceProfile?.options
          ?.find((option) => option.type === "COLOR" || option.type === "SHADE")
          ?.values.find((value) => value.isActive);
        const firstSubmittedColor =
          !submittedVisualValue && submittedProductKind === "UNSTITCHED_FABRIC"
            ? input.commerceProfile?.variants[0]
            : undefined;
        const compatibilityInput = submittedVisualValue
          ? {
              ...input.product,
              color: submittedVisualValue.label,
              colorHex: submittedVisualValue.swatchHex || "",
            }
          : firstSubmittedColor
          ? {
              ...input.product,
              color: firstSubmittedColor.label,
              colorHex: firstSubmittedColor.colorHex || "",
            }
          : input.product;
        const compatibility = classification
          ? normalizeCatalogCompatibilityFields(classification, compatibilityInput)
          : {
              fabricType: compatibilityInput.fabricType.trim(),
              color: compatibilityInput.color.trim(),
              colorHex: compatibilityInput.colorHex.trim(),
            };
        if (
          classification &&
          isProductEditorFieldRequired(
            classification.editorSchema.fields.fabric
          ) &&
          !compatibility.fabricType
        ) {
          throw new ProductEditorError("Fabric type is required for this category");
        }
        if (
          classification &&
          isProductEditorFieldRequired(
            classification.editorSchema.fields.color
          ) &&
          !compatibility.color
        ) {
          throw new ProductEditorError("Color is required for this category");
        }
        if (
          compatibilityInput.colorHex.trim() &&
          !isValidHexColor(compatibilityInput.colorHex)
        ) {
          throw new ProductEditorError(
            "Enter a 6-digit product color hex code such as #0088CC"
          );
        }
        if (compatibility.color && !isValidHexColor(compatibility.colorHex)) {
          throw new ProductEditorError("Choose a valid product color");
        }

        let categoryId = input.product.categoryId || existing?.categoryId;
        if (classification) {
          const name = compatibilityCategoryName(
            classification,
            compatibility.fabricType
          );
          const category = await tx.category.upsert({
            where: { name },
            create: {
              name,
              description: `Compatibility category for ${classification.label} products.`,
            },
            update: {},
            select: { id: true },
          });
          categoryId = category.id;
        }
        if (!categoryId) {
          throw new ProductEditorError("Choose a product category");
        }

        if (
          classification &&
          !FEATURE_FLAGS.COMMERCE_PROFILE_V1
        ) {
          const existingPrimaryKind = existingCatalogAssignments.find(
            (assignment) => assignment.isPrimary
          )?.catalogNode.productKind;
          // A dormant profile remains the authoritative behavior during a
          // commerce-only rollback. Fall back to the old primary for products
          // that have never had a profile.
          const establishedProductKind =
            existingCommerceProfile?.productKind || existingPrimaryKind;
          if (
            !canSaveProductKindWithoutCompanionFeature(
              establishedProductKind,
              classification.productKind
            )
          ) {
            throw new ProductEditorError(
              "Enable selling options before creating or changing to this product category"
            );
          }
        }

        let commerce = input.commerceProfile;
        if (FEATURE_FLAGS.COMMERCE_PROFILE_V1) {
          if (!commerce) {
            throw new ProductEditorError("Selling settings are required for this product");
          }
          const productKind = classification?.productKind || commerce.productKind;
          const editorSchema =
            classification?.editorSchema ||
            productEditorSchemaForKind(productKind);
          if (
            !FEATURE_FLAGS.CATALOG_ADMIN_ASSIGNMENTS_V1 &&
            existingCommerceProfile &&
            existingCommerceProfile.productKind !== productKind
          ) {
            throw new ProductEditorError(
              "Enable catalog assignments before changing this product's type"
            );
          }
          if (
            !FEATURE_FLAGS.CATALOG_ADMIN_ASSIGNMENTS_V1 &&
            !existingCommerceProfile &&
            productKind !== "UNSTITCHED_FABRIC"
          ) {
            throw new ProductEditorError(
              "Enable catalog assignments before creating a non-fabric product"
            );
          }
          commerce = {
            ...commerce,
            productKind,
            stitchingEligible:
              editorSchema.fields.stitching.mode !== "hidden" &&
              commerce.stitchingEligible,
            requiresSelection:
              editorSchema.options.mode === "required" ||
              commerce.requiresSelection ||
              commerce.variants.length > 0 ||
              Boolean(commerce.options?.length),
            optionLabel:
              productKind === "UNSTITCHED_FABRIC" && commerce.variants.length > 0
                ? "Color"
                : commerce.optionLabel,
          };
          const axes = commerce.options || [];
          if (axes.length > 0) {
            const types = new Set(axes.map((axis) => axis.type));
            const allowedTypes = new Set([
              ...editorSchema.optionAxes.required,
              ...editorSchema.optionAxes.optional,
            ]);
            const missingRequired = editorSchema.optionAxes.required.find((type) => !types.has(type));
            if (missingRequired || [...types].some((type) => !allowedTypes.has(type))) {
              throw new ProductEditorError(`These option axes are not valid for ${classification?.label || productKind}`);
            }
            const visualAxis = axes.find((axis) => axis.type === "COLOR" || axis.type === "SHADE");
            if (visualAxis?.values.some((value) => value.images.length === 0)) {
              throw new ProductEditorError(`${visualAxis.label} values need at least one image each`);
            }
          } else if (productKind === "UNSTITCHED_FABRIC" && commerce.variants.length > 0) {
            const invalidColorIndex = commerce.variants.findIndex(
              (variant) =>
                !/^#[0-9a-f]{6}$/i.test(variant.colorHex || "") ||
                variant.images.length === 0
            );
            if (invalidColorIndex >= 0) {
              throw new ProductEditorError(
                `Color ${invalidColorIndex + 1} needs a valid swatch and at least one image`
              );
            }
          } else if (
            commerce.variants.some(
              (variant) => variant.colorHex || variant.images.length > 0
            )
          ) {
            throw new ProductEditorError(
              "Per-color galleries are currently available only for unstitched fabric"
            );
          }
          if (commerce.requiresSelection && commerce.variants.length === 0) {
            throw new ProductEditorError(
              `${classification?.label || "This product"} needs at least one ${
                editorSchema.options.label.toLocaleLowerCase("en-US") || "option"
              }`
            );
          }
        }

        const requestedProductSku = input.product.sku.trim();
        const productSku =
          requestedProductSku || existing?.sku || createAutomaticProductSku(input.product.name);

        if (commerce) {
          const existingVariantsById = new Map(
            (existingCommerceProfile?.variants || []).map((variant) => [variant.id, variant])
          );
          const existingVariantsByKey = new Map(
            (existingCommerceProfile?.variants || []).map((variant) => [
              variant.optionKey.toLocaleLowerCase("en-US"),
              variant,
            ])
          );
          commerce = {
            ...commerce,
            variants: commerce.variants.map((variant) => {
              const previous = variant.id
                ? existingVariantsById.get(variant.id)
                : existingVariantsByKey.get(
                    variant.optionKey.toLocaleLowerCase("en-US")
                  );
              const sku =
                variant.sku?.trim() ||
                previous?.sku?.trim() ||
                (variant.isActive
                  ? createAutomaticVariantSku(
                      productSku,
                      variant.optionKey,
                      variant.label
                    )
                  : undefined);
              return { ...variant, sku };
            }),
          };
        }

        const submittedVariantSkus = commerce?.variants
          .map((variant) => variant.sku?.trim())
          .filter((sku): sku is string => Boolean(sku)) || [];
        const normalizedVariantSkus = new Set<string>();
        for (const sku of submittedVariantSkus) {
          const normalizedSku = sku.toLocaleLowerCase("en-US");
          if (normalizedVariantSkus.has(normalizedSku)) {
            throw new ProductEditorError("Each combination must have a unique SKU");
          }
          normalizedVariantSkus.add(normalizedSku);
        }
        if (submittedVariantSkus.some((sku) => sku.toLocaleLowerCase("en-US") === productSku.toLocaleLowerCase("en-US"))) {
          throw new ProductEditorError("A combination SKU cannot match the parent product code");
        }
        const conflictingParentProduct = await tx.product.findFirst({
          where: {
            ...(existing ? { id: { not: existing.id } } : {}),
            sku: { equals: productSku, mode: "insensitive" },
          },
          select: { sku: true },
        });
        if (conflictingParentProduct) {
          throw new ProductEditorError(
            `Product code ${conflictingParentProduct.sku} is already in use`
          );
        }
        if (submittedVariantSkus.length > 0) {
          const conflictingProduct = await tx.product.findFirst({
            where: {
              ...(existing ? { id: { not: existing.id } } : {}),
              OR: submittedVariantSkus.map((sku) => ({ sku: { equals: sku, mode: "insensitive" as const } })),
            },
            select: { sku: true },
          });
          if (conflictingProduct) {
            throw new ProductEditorError(`Combination SKU ${conflictingProduct.sku} is already used by a product`);
          }
          const conflictingVariant = await tx.productVariant.findFirst({
            where: {
              ...(existingCommerceProfile
                ? { commerceProfileId: { not: existingCommerceProfile.id } }
                : {}),
              OR: submittedVariantSkus.map((sku) => ({
                sku: { equals: sku, mode: "insensitive" as const },
              })),
            },
            select: { sku: true },
          });
          if (conflictingVariant) {
            throw new ProductEditorError(
              `Combination SKU ${conflictingVariant.sku} is already in use`
            );
          }
        }
        const parentSkuVariant = await tx.productVariant.findFirst({
          where: { sku: { equals: productSku, mode: "insensitive" } },
          select: { sku: true },
        });
        if (parentSkuVariant) {
          throw new ProductEditorError(`Product code ${productSku} is already used by a combination`);
        }

        const variantInventory =
          commerce?.requiresSelection
            ? commerce.variants
                .filter((variant) => variant.isActive && variant.inStock)
                .reduce((total, variant) => total + variant.stockQuantity, 0)
            : null;

        const productData = {
          sku: productSku,
          slug: input.product.slug || slugFromSku(productSku),
          name: input.product.name,
          description: input.product.description,
          longDescription: input.product.longDescription?.trim() || null,
          price: input.product.price,
          originalPrice: input.product.originalPrice ?? null,
          ...compatibility,
          images: JSON.stringify(input.product.images),
          videoUrl: input.product.videoUrl?.trim() || null,
          tags: JSON.stringify([
            ...input.product.tags.filter((tag) => tag !== ARCHIVED_PRODUCT_TAG),
            ...(existing?.tags.includes(ARCHIVED_PRODUCT_TAG)
              ? [ARCHIVED_PRODUCT_TAG]
              : []),
          ]),
          badge: input.product.badge ?? null,
          inStock:
            variantInventory === null
              ? input.product.inStock && input.product.stockQuantity > 0
              : variantInventory > 0,
          stockQuantity:
            variantInventory === null
              ? input.product.stockQuantity
              : variantInventory,
          lowStockThreshold: input.product.lowStockThreshold,
          metaTitle: input.product.metaTitle?.trim() || null,
          metaDescription: input.product.metaDescription?.trim() || null,
          categoryId,
        };

        const savedProduct = existing
          ? await tx.product.update({ where: { id: existing.id }, data: productData })
          : await tx.product.create({ data: productData });

        if (desiredAssignments) {
          const desiredIds = desiredAssignments.map((item) => item.catalogNodeId);
          await tx.productCatalogAssignment.deleteMany({
            where: {
              productId: savedProduct.id,
              ...(desiredIds.length
                ? { catalogNodeId: { notIn: desiredIds } }
              : {}),
            },
          });
          // Clear the old primary first so the partial unique index can safely
          // accept a different primary in this same transaction.
          await tx.productCatalogAssignment.updateMany({
            where: { productId: savedProduct.id, isPrimary: true },
            data: { isPrimary: false },
          });
          for (const [index, assignment] of desiredAssignments.entries()) {
            await tx.productCatalogAssignment.upsert({
              where: {
                productId_catalogNodeId: {
                  productId: savedProduct.id,
                  catalogNodeId: assignment.catalogNodeId,
                },
              },
              create: {
                productId: savedProduct.id,
                ...assignment,
                isPrimary: index === 0,
              },
              update: {
                isPrimary: index === 0,
                isFeatured: assignment.isFeatured,
                displayOrder: assignment.displayOrder,
              },
            });
          }
        }

        if (commerce) {
          const existingVariantIds = new Set(
            existingCommerceProfile?.variants.map((variant) => variant.id) || []
          );
          const unknownVariant = commerce.variants.find(
            (variant) => variant.id && !existingVariantIds.has(variant.id)
          );
          if (unknownVariant) {
            throw new ProductEditorError(
              "One selling option changed elsewhere. Reload and try again.",
              409
            );
          }

          const activeVariantPrices = commerce.variants
            .filter((variant) => variant.isActive)
            .map((variant) => input.product.price + variant.priceAdjustment);
          const minPrice = activeVariantPrices.length ? Math.min(...activeVariantPrices) : null;
          const maxPrice = activeVariantPrices.length ? Math.max(...activeVariantPrices) : null;
          const profile = await tx.productCommerceProfile.upsert({
            where: { productId: savedProduct.id },
            create: {
              productId: savedProduct.id,
              productKind: commerce.productKind,
              stitchingEligible: commerce.stitchingEligible,
              requiresSelection: commerce.requiresSelection,
              optionLabel: commerce.optionLabel?.trim() || null,
              sizeGuideUrl: commerce.sizeGuideUrl?.trim() || null,
              details: commerce.details,
              minPrice,
              maxPrice,
            },
            update: {
              productKind: commerce.productKind,
              stitchingEligible: commerce.stitchingEligible,
              requiresSelection: commerce.requiresSelection,
              optionLabel: commerce.optionLabel?.trim() || null,
              sizeGuideUrl: commerce.sizeGuideUrl?.trim() || null,
              details: commerce.details,
              minPrice,
              maxPrice,
            },
          });

          const savedOptionByKey = new Map<string, {
            id: string;
            valuesByKey: Map<string, string>;
          }>();
          if (commerce.options?.length) {
            const existingOptionIds = new Set(existingCommerceProfile?.options.map((option) => option.id) || []);
            const existingValueIds = new Set(existingCommerceProfile?.options.flatMap((option) => option.values.map((value) => value.id)) || []);
            for (const option of commerce.options) {
              if (option.id && !existingOptionIds.has(option.id)) {
                throw new ProductEditorError("One option axis changed elsewhere. Reload and try again.", 409);
              }
              if (option.values.some((value) => value.id && !existingValueIds.has(value.id))) {
                throw new ProductEditorError("One option value changed elsewhere. Reload and try again.", 409);
              }
            }

            const retainedOptionIds: string[] = [];
            for (const [displayOrder, option] of commerce.options.entries()) {
              const existingOption = option.id
                ? existingCommerceProfile?.options.find((candidate) => candidate.id === option.id)
                : existingCommerceProfile?.options.find((candidate) => candidate.key.toLocaleLowerCase("en-US") === option.key.toLocaleLowerCase("en-US"));
              const savedOption = existingOption
                ? await tx.productOption.update({
                    where: { id: existingOption.id },
                    data: { key: option.key, label: option.label, type: option.type, isRequired: option.isRequired, displayOrder },
                  })
                : await tx.productOption.create({
                    data: { commerceProfileId: profile.id, key: option.key, label: option.label, type: option.type, isRequired: option.isRequired, displayOrder },
                  });
              retainedOptionIds.push(savedOption.id);

              const previousValues = existingOption?.values || [];
              const retainedValueIds: string[] = [];
              const valuesByKey = new Map<string, string>();
              for (const [valueOrder, value] of option.values.entries()) {
                const previousValue = value.id
                  ? previousValues.find((candidate) => candidate.id === value.id)
                  : previousValues.find((candidate) => candidate.key.toLocaleLowerCase("en-US") === value.key.toLocaleLowerCase("en-US"));
                const valueData = {
                  key: value.key,
                  label: value.label,
                  swatchHex: value.swatchHex?.trim() || null,
                  images: value.images.length ? JSON.stringify(value.images) : null,
                  isActive: value.isActive,
                  displayOrder: valueOrder,
                };
                const savedValue = previousValue
                  ? await tx.productOptionValue.update({ where: { id: previousValue.id }, data: valueData })
                  : await tx.productOptionValue.create({ data: { optionId: savedOption.id, ...valueData } });
                retainedValueIds.push(savedValue.id);
                valuesByKey.set(value.key.toLocaleLowerCase("en-US"), savedValue.id);
              }
              await tx.productOptionValue.updateMany({
                where: { optionId: savedOption.id, id: { notIn: retainedValueIds } },
                data: { isActive: false },
              });
              savedOptionByKey.set(option.key.toLocaleLowerCase("en-US"), { id: savedOption.id, valuesByKey });
            }
            await tx.productOption.deleteMany({
              where: { commerceProfileId: profile.id, id: { notIn: retainedOptionIds } },
            });
          }

          const retainedVariantIds = commerce.variants.flatMap((variant) =>
            variant.id ? [variant.id] : []
          );
          // Release this product's current codes inside the transaction before
          // assigning the submitted set. This permits safe SKU swaps while the
          // unique index still protects every committed inventory identity.
          await tx.productVariant.updateMany({
            where: { commerceProfileId: profile.id },
            data: { sku: null },
          });
          await tx.productVariant.updateMany({
            where: {
              commerceProfileId: profile.id,
              ...(retainedVariantIds.length
                ? { id: { notIn: retainedVariantIds } }
                : {}),
            },
            data: { isActive: false, inStock: false, sku: null },
          });

          for (const [displayOrder, variant] of commerce.variants.entries()) {
            const variantData = {
              optionKey: variant.optionKey,
              label: variant.label,
              sku: variant.sku?.trim() || null,
              priceAdjustment: variant.priceAdjustment,
              stockQuantity: variant.stockQuantity,
              inStock: variant.inStock && variant.stockQuantity > 0,
              isActive: variant.isActive,
              displayOrder,
              colorHex: variant.colorHex?.trim() || null,
              images: variant.images.length ? JSON.stringify(variant.images) : null,
            };
            let savedVariant;
            if (variant.id) {
              savedVariant = await tx.productVariant.update({ where: { id: variant.id }, data: variantData });
            } else {
              const reusableVariant = existingCommerceProfile?.variants.find(
                (candidate) =>
                  candidate.optionKey.toLocaleLowerCase("en-US") ===
                  variant.optionKey.toLocaleLowerCase("en-US")
              );
              if (reusableVariant) {
                savedVariant = await tx.productVariant.update({
                  where: { id: reusableVariant.id },
                  data: variantData,
                });
              } else {
                savedVariant = await tx.productVariant.create({
                  data: { commerceProfileId: profile.id, ...variantData },
                });
              }
            }
            if (commerce.options?.length) {
              await tx.productVariantSelection.deleteMany({ where: { variantId: savedVariant.id } });
              for (const selection of variant.selections || []) {
                const option = savedOptionByKey.get(selection.optionKey.toLocaleLowerCase("en-US"));
                const optionValueId = option?.valuesByKey.get(selection.valueKey.toLocaleLowerCase("en-US"));
                if (!option || !optionValueId) {
                  throw new ProductEditorError("A variant contains an invalid option combination");
                }
                await tx.productVariantSelection.create({
                  data: { variantId: savedVariant.id, optionId: option.id, optionValueId },
                });
              }
            }
          }
        }

        return {
          product: savedProduct,
          oldProduct: existing
            ? {
                name: existing.name,
                sku: existing.sku,
                price: Number(existing.price),
                categoryId: existing.categoryId,
              }
            : undefined,
          assignmentCount: desiredAssignments?.length,
          productKind: commerce?.productKind,
        };
      },
      { isolationLevel: "Serializable", maxWait: 5_000, timeout: 30_000 }
    );

    revalidateTag("products", { expire: 0 });
    revalidateTag("categories", { expire: 0 });
    revalidateTag("featured-categories", { expire: 0 });

    void createAuditLog({
      userId: access.session.user.id,
      userEmail: access.session.user.email || undefined,
      action: isEdit ? "PRODUCT_UPDATED" : "PRODUCT_CREATED",
      entity: "Product",
      entityId: saved.product.id,
      oldValue: saved.oldProduct,
      newValue: {
        name: saved.product.name,
        sku: saved.product.sku,
        price: Number(saved.product.price),
        categoryId: saved.product.categoryId,
        catalogAssignmentCount: saved.assignmentCount,
        productKind: saved.productKind,
        operation: "PRODUCT_EDITOR_ATOMIC_SAVE",
      },
    });

    return NextResponse.json(
      { product: serializeProduct(saved.product) },
      { status: isEdit ? 200 : 201 }
    );
  } catch (error) {
    if (error instanceof ProductEditorError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        {
          error:
            "This product changed while it was being saved. Reload and try again.",
        },
        { status: 409 }
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(",")
        : String(error.meta?.target || "");
      const message = target.includes("sku")
        ? "That product or option SKU is already in use"
        : target.includes("slug")
          ? "That URL slug is already in use"
          : target.includes("optionKey")
            ? "That option already exists for this product"
            : "A product with one of these unique values already exists";
      return NextResponse.json({ error: message }, { status: 409 });
    }
    console.error("Product editor save error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
