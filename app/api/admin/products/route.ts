import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminProducts, createAdminProduct, createAuditLog } from "@/lib/db-queries";
import { InvalidAdminCatalogNodeFilterError } from "@/lib/db/products";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from '@/lib/utils/errors';
import { adminLimitParam, adminPageParam, adminSearchParam } from "@/lib/admin-pagination";
import { requireAdminApiAccess } from "@/lib/admin-route-guard";
import { prisma } from "@/lib/db";
import { createAutomaticProductSku } from "@/lib/product-sku";

export const dynamic = "force-dynamic";

const createProductSchema = z.object({
  sku: z.string().trim().max(120).optional().default(""),
  slug: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  longDescription: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  originalPrice: z.number().positive().optional(),
  fabricType: z.string().min(1, "Fabric type is required"),
  color: z.string().min(1, "Color is required"),
  colorHex: z.string().min(1, "Color hex is required"),
  images: z.array(z.string().min(1)).min(1, "At least one image is required"),
  videoUrl: z.string().optional(),
  tags: z.array(z.string()).optional(),
  badge: z.enum(["NEW", "TRENDING", "HOT", "LIMITED", "FEATURED"]).optional(),
  inStock: z.boolean().default(true),
  stockQuantity: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(1).default(5),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
});

const catalogNodeFilterSchema = z
  .string()
  .trim()
  .min(1, "Catalog category is required")
  .max(128, "Catalog category is invalid")
  .optional();

export const GET = withLoggedAdminHandler(async (req: Request) => {
  // Single auth() call — session verified once, not twice.
  const access = await requireAdminApiAccess(req);
  if (!access.ok) return access.response;

  const { searchParams } = new URL(req.url);
  const page = adminPageParam(searchParams.get('page'));
  const limit = adminLimitParam(searchParams.get('limit'), 50);
  const search = adminSearchParam(searchParams.get('search'));
  // `category` remains the legacy fabricType filter for compatibility.
  const fabricType = searchParams.get('category') || undefined;
  const stock = searchParams.get('stock') || undefined;
  const parsedCatalogNodeId = catalogNodeFilterSchema.safeParse(
    searchParams.get("catalogNodeId") || undefined
  );
  if (!parsedCatalogNodeId.success) {
    return NextResponse.json(
      { error: parsedCatalogNodeId.error.errors[0]?.message || "Invalid catalog category" },
      { status: 400 }
    );
  }
  if (
    parsedCatalogNodeId.data &&
    !FEATURE_FLAGS.CATALOG_ADMIN_ASSIGNMENTS_V1
  ) {
    return NextResponse.json(
      { error: "Catalog category filtering is unavailable" },
      { status: 400 }
    );
  }

  try {
    const result = await getAdminProducts({
      page,
      limit,
      search,
      fabricType,
      stock,
      catalogNodeId: parsedCatalogNodeId.data,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof InvalidAdminCatalogNodeFilterError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
});

export const POST = withLoggedAdminHandler(async (req: Request) => {
  // Obtain session once — reused for both the auth gate and the audit log.
  const access = await requireAdminApiAccess(req);
  if (!access.ok) return access.response;
  const session = access.session;

  const body = await req.json();
  const result = createProductSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.errors[0].message },
      { status: 400 }
    );
  }

  try {
    const sku = result.data.sku || createAutomaticProductSku(result.data.name);
    const [conflictingProduct, conflictingVariant] = await Promise.all([
      prisma.product.findFirst({
        where: { sku: { equals: sku, mode: "insensitive" } },
        select: { sku: true },
      }),
      prisma.productVariant.findFirst({
        where: { sku: { equals: sku, mode: "insensitive" } },
        select: { sku: true },
      }),
    ]);
    if (conflictingProduct || conflictingVariant) {
      return NextResponse.json(
        { error: `Product code ${conflictingProduct?.sku || conflictingVariant?.sku} is already in use` },
        { status: 409 }
      );
    }
    const product = await createAdminProduct({ ...result.data, sku });

    // Audit log — reuse session obtained above, no extra auth() call needed.
    void createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      action: "PRODUCT_CREATED",
      entity: "Product",
      entityId: product.id,
      newValue: { name: product.name, sku: product.sku, price: product.price },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
