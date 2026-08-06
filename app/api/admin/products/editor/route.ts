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
    sku: z.string().trim().min(1, "Product code is required").max(120),
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

const variantSchema = z.object({
  id: recordIdSchema.optional(),
  optionKey: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  sku: z.string().trim().max(120).optional(),
  priceAdjustment: z.number().min(-1_000_000).max(1_000_000),
  stockQuantity: z.number().int().min(0).max(10_000_000),
  inStock: z.boolean(),
  isActive: z.boolean(),
});

const commerceProfileSchema = z
  .object({
    productKind: productKindSchema,
    stitchingEligible: z.boolean(),
    requiresSelection: z.boolean(),
    optionLabel: z.string().trim().max(60).optional(),
    sizeGuideUrl: z.string().trim().max(2_048).optional(),
    details: z.array(detailSchema).max(12),
    variants: z.array(variantSchema).max(50),
  })
  .superRefine((profile, context) => {
    const optionKeys = new Set<string>();
    const skus = new Set<string>();
    const variantIds = new Set<string>();
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
    });
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
                include: { variants: true },
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

        const compatibility = classification
          ? normalizeCatalogCompatibilityFields(classification, input.product)
          : {
              fabricType: input.product.fabricType.trim(),
              color: input.product.color.trim(),
              colorHex: input.product.colorHex.trim(),
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
          compatibility.color &&
          !/^#[0-9a-f]{6}$/i.test(compatibility.colorHex)
        ) {
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
              commerce.requiresSelection,
          };
          if (commerce.requiresSelection && commerce.variants.length === 0) {
            throw new ProductEditorError(
              `${classification?.label || "This product"} needs at least one ${
                editorSchema.options.label.toLocaleLowerCase("en-US") || "option"
              }`
            );
          }
        }

        const variantInventory =
          commerce?.requiresSelection
            ? commerce.variants
                .filter((variant) => variant.isActive && variant.inStock)
                .reduce((total, variant) => total + variant.stockQuantity, 0)
            : null;

        const productData = {
          sku: input.product.sku,
          slug: input.product.slug || slugFromSku(input.product.sku),
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
            },
            update: {
              productKind: commerce.productKind,
              stitchingEligible: commerce.stitchingEligible,
              requiresSelection: commerce.requiresSelection,
              optionLabel: commerce.optionLabel?.trim() || null,
              sizeGuideUrl: commerce.sizeGuideUrl?.trim() || null,
              details: commerce.details,
            },
          });

          const retainedVariantIds = commerce.variants.flatMap((variant) =>
            variant.id ? [variant.id] : []
          );
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
            };
            if (variant.id) {
              await tx.productVariant.update({ where: { id: variant.id }, data: variantData });
            } else {
              const reusableVariant = existingCommerceProfile?.variants.find(
                (candidate) =>
                  candidate.optionKey.toLocaleLowerCase("en-US") ===
                  variant.optionKey.toLocaleLowerCase("en-US")
              );
              if (reusableVariant) {
                await tx.productVariant.update({
                  where: { id: reusableVariant.id },
                  data: variantData,
                });
              } else {
                await tx.productVariant.create({
                  data: { commerceProfileId: profile.id, ...variantData },
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
