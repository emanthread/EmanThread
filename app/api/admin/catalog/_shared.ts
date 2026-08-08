import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { requireAdminApiAccess } from "@/lib/admin-route-guard";
import { sanitizeDbError } from "@/lib/utils/errors";

export const catalogRecordIdSchema = z
  .string()
  .trim()
  .min(1, "ID is required")
  .max(128, "ID is too long");

const catalogNodeSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const catalogNodeSlugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(80, "Slug must be 80 characters or fewer")
  .transform((value) => value.toLowerCase())
  .refine(
    (value) => catalogNodeSlugPattern.test(value),
    "Slug may use lowercase letters, numbers, and single hyphens only"
  );

export const catalogNodeTypeSchema = z
  .string()
  .trim()
  .min(1, "Kind is required")
  // Kind is a display/organization field, not part of a route. Keep it
  // permissive and preserve its stored casing so older taxonomy records can
  // still be edited safely.
  .max(48, "Kind must be 48 characters or fewer");

export const catalogNodeLabelSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(120, "Name must be 120 characters or fewer");

const optionalCatalogText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength, `Must be ${maxLength} characters or fewer`)
    .transform((value) => value || null)
    .nullable()
    .optional();

function isAllowedCatalogBannerImage(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true;

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "res.cloudinary.com" ||
        url.hostname === "images.unsplash.com")
    );
  } catch {
    return false;
  }
}

export const catalogNodeDescriptionSchema = optionalCatalogText(1_000);

export const catalogNodeBannerImageSchema = optionalCatalogText(2_000).refine(
  (value) => value === undefined || value === null || isAllowedCatalogBannerImage(value),
  "Banner image must be a local path or an approved HTTPS image URL"
);

export const catalogNodeBannerAltSchema = optionalCatalogText(240);

export const catalogProductKindSchema = z.enum([
  "UNSTITCHED_FABRIC",
  "READY_TO_WEAR",
  "FRAGRANCE",
  "BEAUTY",
  "TEENS",
  "GIFT",
  "GIFT_BOX",
  "ACCESSORY",
]);

const catalogNodeMutableFields = {
  parentId: catalogRecordIdSchema.nullable(),
  nodeType: catalogNodeTypeSchema,
  productKind: catalogProductKindSchema.nullable().optional(),
  label: catalogNodeLabelSchema,
  slug: catalogNodeSlugSchema,
  description: catalogNodeDescriptionSchema,
  bannerImage: catalogNodeBannerImageSchema,
  bannerAlt: catalogNodeBannerAltSchema,
  displayOrder: z.number().int().min(0).max(1_000_000),
  isActive: z.boolean(),
  isVisible: z.boolean(),
};

export const createCatalogNodeSchema = z
  .object(catalogNodeMutableFields)
  .strict()
  .refine(
    (value) => !value.isVisible || value.isActive,
    "A visible catalog path must also be active"
  );

export const updateCatalogNodeSchema = z
  .object({
    parentId: catalogNodeMutableFields.parentId.optional(),
    nodeType: catalogNodeMutableFields.nodeType.optional(),
    productKind: catalogNodeMutableFields.productKind,
    label: catalogNodeMutableFields.label.optional(),
    slug: catalogNodeMutableFields.slug.optional(),
    description: catalogNodeMutableFields.description,
    bannerImage: catalogNodeMutableFields.bannerImage,
    bannerAlt: catalogNodeMutableFields.bannerAlt,
    displayOrder: catalogNodeMutableFields.displayOrder.optional(),
    isActive: catalogNodeMutableFields.isActive.optional(),
    isVisible: catalogNodeMutableFields.isVisible.optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Provide at least one catalog field to update"
  );

/**
 * Catalog paths are derived from their parent and slug. Keeping this in one
 * place prevents a form edit from creating an arbitrary route that is not a
 * real taxonomy path.
 */
export function buildCatalogNodePath(
  parentPath: string | null,
  slug: string
): string {
  const prefix = parentPath ? parentPath.replace(/\/+$/, "") : "";
  return `${prefix}/${slug}`;
}

export class CatalogNodeMutationError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409
  ) {
    super(message);
    this.name = "CatalogNodeMutationError";
  }
}

export async function requireCatalogAdminApi(request: Request) {
  if (!FEATURE_FLAGS.CATALOG_ADMIN_ASSIGNMENTS_V1) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  return requireAdminApiAccess(request);
}

export function catalogApiError(error: unknown, context: string) {
  if (error instanceof CatalogNodeMutationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  ) {
    return NextResponse.json(
      {
        error:
          "Catalog data changed at the same time. Refresh and try the action again.",
      },
      { status: 409 }
    );
  }

  console.error(`[catalog-admin] ${context}:`, error);
  const { message, status } = sanitizeDbError(error);
  return NextResponse.json({ error: message }, { status });
}
