import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/db-queries";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { withLoggedAdminHandler } from "@/lib/logger";
import { requireAdminApiAccess } from "@/lib/admin-route-guard";
import { productKindRequiresSelection } from "@/lib/commerce";
import {
  canSaveProductKindWithoutCompanionFeature,
  isProductEditorFieldVisible,
  productEditorSchemaForKind,
} from "@/lib/catalog-product-classification";
import { sanitizeDbError } from "@/lib/utils/errors";
import { parseProductImages } from "@/lib/utils/parse-images";

export const dynamic = "force-dynamic";

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

const detailSchema = z.object({
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(500),
});

const safeMediaUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2_048)
  .refine(
    (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
    "Media URLs must begin with /, http://, or https://"
  );

const variantSchema = z.object({
  id: z.string().min(1).optional(),
  optionKey: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  sku: z.string().trim().max(120).optional(),
  priceAdjustment: z.number().min(-1_000_000).max(1_000_000),
  stockQuantity: z.number().int().min(0).max(10_000_000),
  inStock: z.boolean(),
  isActive: z.boolean(),
  colorHex: z.string().trim().max(20).optional(),
  images: z.array(safeMediaUrlSchema).max(10).default([]),
});

const commerceProfileSchema = z
  .object({
    productKind: productKindSchema,
    stitchingEligible: z.boolean(),
    requiresSelection: z.boolean(),
    optionLabel: z.string().trim().max(60).optional(),
    sizeGuideUrl: z.string().trim().max(2048).optional(),
    details: z.array(detailSchema).max(12),
    variants: z.array(variantSchema).max(50),
  })
  .superRefine((profile, context) => {
    const editorSchema = productEditorSchemaForKind(profile.productKind);
    const requiresSelection =
      productKindRequiresSelection(profile.productKind) || profile.requiresSelection;
    if (requiresSelection && profile.variants.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["variants"],
        message: productKindRequiresSelection(profile.productKind)
          ? `This product type needs at least one ${editorSchema.options.label.toLocaleLowerCase()}`
          : "Add at least one option before requiring a customer selection",
      });
    }
    if (
      (requiresSelection || profile.variants.length > 0) &&
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

    const optionKeys = new Set<string>();
    const skus = new Set<string>();
    const variantIds = new Set<string>();
    profile.variants.forEach((variant, index) => {
      if (variant.id && variantIds.has(variant.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants", index, "id"],
          message: "Each saved option can appear only once",
        });
      }
      if (variant.id) variantIds.add(variant.id);
      const key = variant.optionKey.toLocaleLowerCase();
      if (optionKeys.has(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants", index, "optionKey"],
          message: "Each option key must be unique",
        });
      }
      optionKeys.add(key);

      const sku = variant.sku?.trim().toLocaleLowerCase();
      if (sku && skus.has(sku)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants", index, "sku"],
          message: "Each variant SKU must be unique",
        });
      }
      if (sku) skus.add(sku);

      if (profile.productKind === "UNSTITCHED_FABRIC") {
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
      } else if (variant.colorHex || variant.images.length > 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants", index],
          message: "Per-color galleries are currently available only for unstitched fabric",
        });
      }
    });

    if (
      profile.productKind === "UNSTITCHED_FABRIC" &&
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

type CommerceProfileWithVariants = Prisma.ProductCommerceProfileGetPayload<{
  include: {
    options: { include: { values: true } };
    variants: { include: { selections: { include: { option: true; optionValue: true } } } };
  };
}>;

function serializeProfile(profile: CommerceProfileWithVariants | null) {
  if (!profile) return null;

  return {
    productKind: profile.productKind,
    stitchingEligible: profile.stitchingEligible,
    requiresSelection: profile.requiresSelection,
    optionLabel: profile.optionLabel || undefined,
    sizeGuideUrl: profile.sizeGuideUrl || undefined,
    details: Array.isArray(profile.details) ? profile.details : [],
    options: profile.options.map((option) => ({
      id: option.id,
      key: option.key,
      label: option.label,
      type: option.type,
      isRequired: option.isRequired,
      values: option.values.filter((value) => value.isActive).map((value) => ({
        id: value.id,
        key: value.key,
        label: value.label,
        swatchHex: value.swatchHex || undefined,
        images: value.images ? parseProductImages(value.images) : [],
        isActive: value.isActive,
      })),
    })),
    variants: profile.variants.filter((variant) => variant.isActive).map((variant) => ({
      id: variant.id,
      optionKey: variant.optionKey,
      label: variant.label,
      sku: variant.sku || undefined,
      priceAdjustment: Number(variant.priceAdjustment),
      stockQuantity: variant.stockQuantity,
      inStock: variant.inStock,
      isActive: variant.isActive,
      colorHex: variant.colorHex || undefined,
      images: variant.images ? parseProductImages(variant.images) : [],
      selections: variant.selections.map((selection) => ({
        optionKey: selection.option.key,
        valueKey: selection.optionValue.key,
      })),
    })),
  };
}

function commerceUnavailable() {
  return NextResponse.json(
    {
      error:
        "Commerce profiles are disabled until the additive catalog rollout is approved.",
    },
    { status: 404 }
  );
}

export const GET = withLoggedAdminHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const access = await requireAdminApiAccess(request);
    if (!access.ok) return access.response;
    if (!FEATURE_FLAGS.COMMERCE_PROFILE_V1) return commerceUnavailable();

    const { id: productId } = await params;
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        commerceProfile: {
          include: {
            options: { include: { values: { orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] } }, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] },
            variants: {
              include: { selections: { include: { option: true, optionValue: true } } },
              orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ profile: serializeProfile(product.commerceProfile) });
  } catch (error) {
    console.error("Get commerce profile error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});

export const PUT = withLoggedAdminHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const access = await requireAdminApiAccess(request);
    if (!access.ok) return access.response;
    if (!FEATURE_FLAGS.COMMERCE_PROFILE_V1) return commerceUnavailable();

    const { id: productId } = await params;
    const parsed = commerceProfileSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid profile" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        price: true,
        commerceProfile: {
          include: {
            options: { include: { values: true } },
            variants: { include: { selections: { include: { option: true, optionValue: true } } } },
          },
        },
      },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (product.commerceProfile?.options.length) {
      return NextResponse.json(
        { error: "Use the product editor to update normalized option matrices." },
        { status: 409 },
      );
    }
    if (
      !FEATURE_FLAGS.CATALOG_ADMIN_ASSIGNMENTS_V1 &&
      !canSaveProductKindWithoutCompanionFeature(
        product.commerceProfile?.productKind,
        parsed.data.productKind
      )
    ) {
      return NextResponse.json(
        {
          error: product.commerceProfile
            ? "Enable catalog assignments before changing this product's type"
            : "Enable catalog assignments before creating a non-fabric product",
        },
        { status: 409 }
      );
    }
    if (FEATURE_FLAGS.CATALOG_ADMIN_ASSIGNMENTS_V1) {
      const primaryAssignment =
        await prisma.productCatalogAssignment.findFirst({
          where: { productId, isPrimary: true },
          select: {
            catalogNode: {
              select: {
                productKind: true,
                isActive: true,
                _count: { select: { children: true } },
              },
            },
          },
        });
      if (
        !primaryAssignment?.catalogNode.isActive ||
        !primaryAssignment.catalogNode.productKind ||
        primaryAssignment.catalogNode._count.children > 0
      ) {
        return NextResponse.json(
          {
            error:
              "Choose a valid primary product category in the product editor first",
          },
          { status: 409 }
        );
      }
      if (
        primaryAssignment.catalogNode.productKind !== parsed.data.productKind
      ) {
        return NextResponse.json(
          {
            error:
              "Product type must match the primary catalog category. Use the product editor to change both together.",
          },
          { status: 409 }
        );
      }
    }
    const invalidPriceOption = parsed.data.variants.find(
      (variant) => Number(product.price) + variant.priceAdjustment <= 0
    );
    if (invalidPriceOption) {
      return NextResponse.json(
        { error: "Every option's final price must be greater than 0" },
        { status: 400 }
      );
    }

    const existingVariantIds = new Set(
      product.commerceProfile?.variants.map((variant) => variant.id) || []
    );
    const unknownVariant = parsed.data.variants.find(
      (variant) => variant.id && !existingVariantIds.has(variant.id)
    );
    if (unknownVariant) {
      return NextResponse.json(
        { error: "One of the options no longer belongs to this product. Reload and try again." },
        { status: 409 }
      );
    }

    // Tailoring is a fabric-only workflow. Normalize this on the server so a
    // crafted admin request cannot enable stitching for readywear, fragrance,
    // beauty, teens, gifts, or accessories.
    const editorSchema = productEditorSchemaForKind(parsed.data.productKind);
    const hasUnstitchedColors =
      parsed.data.productKind === "UNSTITCHED_FABRIC" &&
      parsed.data.variants.length > 0;
    const data = {
      ...parsed.data,
      // Client input must never downgrade ready-to-wear or teens into a
      // generic product line. This keeps the persisted API contract aligned
      // with the storefront even for handcrafted admin requests.
      requiresSelection:
        productKindRequiresSelection(parsed.data.productKind) ||
        parsed.data.requiresSelection ||
        hasUnstitchedColors,
      optionLabel: hasUnstitchedColors ? "Color" : parsed.data.optionLabel,
      stitchingEligible:
        isProductEditorFieldVisible(editorSchema.fields.stitching)
          ? parsed.data.stitchingEligible
          : false,
    };
    const savedProfile = await prisma.$transaction(async (tx) => {
      const baseProduct = await tx.product.findUniqueOrThrow({ where: { id: productId }, select: { price: true } });
      const activeVariantPrices = data.variants
        .filter((variant) => variant.isActive)
        .map((variant) => Number(baseProduct.price) + variant.priceAdjustment);
      const minPrice = activeVariantPrices.length ? Math.min(...activeVariantPrices) : null;
      const maxPrice = activeVariantPrices.length ? Math.max(...activeVariantPrices) : null;
      const profile = await tx.productCommerceProfile.upsert({
        where: { productId },
        create: {
          productId,
          productKind: data.productKind,
          stitchingEligible: data.stitchingEligible,
          requiresSelection: data.requiresSelection,
          optionLabel: data.optionLabel?.trim() || null,
          sizeGuideUrl: data.sizeGuideUrl?.trim() || null,
          details: data.details,
          minPrice,
          maxPrice,
        },
        update: {
          productKind: data.productKind,
          stitchingEligible: data.stitchingEligible,
          requiresSelection: data.requiresSelection,
          optionLabel: data.optionLabel?.trim() || null,
          sizeGuideUrl: data.sizeGuideUrl?.trim() || null,
          details: data.details,
          minPrice,
          maxPrice,
        },
      });

      const retainedVariantIds = data.variants.flatMap((variant) =>
        variant.id ? [variant.id] : []
      );
      // Removed options are archived instead of deleted. Their SKU is cleared
      // because historic order snapshots already retain it and a replacement
      // option may legitimately need the same SKU.
      await tx.productVariant.updateMany({
        where: {
          commerceProfileId: profile.id,
          ...(retainedVariantIds.length ? { id: { notIn: retainedVariantIds } } : {}),
        },
        data: { isActive: false, inStock: false, sku: null },
      });

      for (const [displayOrder, variant] of data.variants.entries()) {
        const variantData = {
          optionKey: variant.optionKey.trim(),
          label: variant.label.trim(),
          sku: variant.sku?.trim() || null,
          priceAdjustment: variant.priceAdjustment,
          stockQuantity: variant.stockQuantity,
          inStock: variant.inStock && variant.stockQuantity > 0,
          isActive: variant.isActive,
          displayOrder,
          colorHex: variant.colorHex?.trim() || null,
          images: variant.images.length ? JSON.stringify(variant.images) : null,
        };

        if (variant.id) {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: variantData,
          });
        } else {
          const reusableVariant = product.commerceProfile?.variants.find(
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

      // Product.updatedAt is the aggregate concurrency token used by the
      // atomic editor, including changes made through this compatibility API.
      if (data.requiresSelection) {
        const aggregate = await tx.productVariant.aggregate({
          where: {
            commerceProfileId: profile.id,
            isActive: true,
            inStock: true,
          },
          _sum: { stockQuantity: true },
        });
        const stockQuantity = aggregate._sum.stockQuantity || 0;
        const firstColor =
          data.productKind === "UNSTITCHED_FABRIC" ? data.variants[0] : undefined;
        await tx.product.update({
          where: { id: productId },
          data: {
            stockQuantity,
            inStock: stockQuantity > 0,
            ...(firstColor
              ? { color: firstColor.label, colorHex: firstColor.colorHex || "" }
              : {}),
            updatedAt: new Date(),
          },
        });
      } else {
        await tx.product.update({
          where: { id: productId },
          data: { updatedAt: new Date() },
        });
      }

      return tx.productCommerceProfile.findUniqueOrThrow({
        where: { id: profile.id },
        include: {
          options: { include: { values: true } },
          variants: {
            include: { selections: { include: { option: true, optionValue: true } } },
            orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      });
    });

    // Product query helpers cache transformed public cards. Refresh that cache
    // after the additive profile changes so option/size data is not delayed.
    revalidateTag("products", { expire: 0 });

    if (access.session.user) {
      void createAuditLog({
        userId: access.session.user.id,
        userEmail: access.session.user.email || undefined,
        action: "PRODUCT_UPDATED",
        entity: "ProductCommerceProfile",
        entityId: savedProfile.id,
        oldValue: serializeProfile(product.commerceProfile) || undefined,
        newValue: serializeProfile(savedProfile) || undefined,
      });
    }

    return NextResponse.json({ profile: serializeProfile(savedProfile) });
  } catch (error) {
    console.error("Save commerce profile error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
