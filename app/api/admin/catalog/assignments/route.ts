import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/db/audit";
import { getClientIp } from "@/lib/client-ip";
import { withLoggedAdminHandler } from "@/lib/logger";
import {
  catalogApiError,
  catalogRecordIdSchema,
  requireCatalogAdminApi,
} from "../_shared";

export const dynamic = "force-dynamic";

const MAX_BULK_PRODUCTS = 100;
const MAX_NODES_PER_REQUEST = 25;
const MAX_ASSIGNMENTS_PER_REQUEST = 500;

const assignmentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(25),
  search: z.string().trim().max(100).optional(),
  productId: catalogRecordIdSchema.optional(),
  catalogNodeId: catalogRecordIdSchema.optional(),
  status: z.enum(["all", "assigned", "unassigned"]).default("all"),
});

const createAssignmentsSchema = z
  .object({
    productId: catalogRecordIdSchema.optional(),
    productIds: z.array(catalogRecordIdSchema).max(MAX_BULK_PRODUCTS).optional(),
    skus: z
      .array(z.string().trim().min(1).max(100))
      .max(MAX_BULK_PRODUCTS)
      .optional(),
    catalogNodeIds: z
      .array(catalogRecordIdSchema)
      .min(1, "Select at least one catalog node")
      .max(MAX_NODES_PER_REQUEST),
    isFeatured: z.boolean().default(false),
    displayOrder: z.number().int().min(0).max(1_000_000).nullable().optional(),
    reviewed: z.boolean().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const referenceCount =
      (value.productId ? 1 : 0) +
      (value.productIds?.length || 0) +
      (value.skus?.length || 0);

    if (referenceCount === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least one Product ID or SKU",
        path: ["productId"],
      });
    }

    if (referenceCount > MAX_BULK_PRODUCTS) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `A maximum of ${MAX_BULK_PRODUCTS} product references is allowed`,
        path: ["productIds"],
      });
    }

    const isBulkRequest = Boolean(value.productIds?.length || value.skus?.length);
    if (isBulkRequest && value.reviewed !== true) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bulk assignments require reviewed=true",
        path: ["reviewed"],
      });
    }
  });

function assignmentFilter(
  status: "all" | "assigned" | "unassigned",
  catalogNodeId?: string
): Prisma.ProductWhereInput {
  if (status === "all") return {};

  const relationFilter = catalogNodeId ? { catalogNodeId } : {};
  return status === "assigned"
    ? { catalogAssignments: { some: relationFilter } }
    : { catalogAssignments: { none: relationFilter } };
}

export const GET = withLoggedAdminHandler(async (request: Request) => {
  const access = await requireCatalogAdminApi(request);
  if (!access.ok) return access.response;

  const url = new URL(request.url);
  const parsed = assignmentQuerySchema.safeParse({
    page: url.searchParams.get("page") || undefined,
    limit: url.searchParams.get("limit") || undefined,
    search: url.searchParams.get("search") || undefined,
    productId: url.searchParams.get("productId") || undefined,
    catalogNodeId: url.searchParams.get("catalogNodeId") || undefined,
    status: url.searchParams.get("status") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid query" },
      { status: 400 }
    );
  }

  const { page, limit, search, productId, catalogNodeId, status } = parsed.data;
  const where: Prisma.ProductWhereInput = {
    ...assignmentFilter(status, catalogNodeId),
    ...(productId ? { id: productId } : {}),
    ...(search
      ? {
          OR: [
            { id: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  try {
    if (catalogNodeId) {
      const filterNode = await prisma.catalogNode.findUnique({
        where: { id: catalogNodeId },
        select: { id: true, isActive: true },
      });
      if (!filterNode) {
        return NextResponse.json(
          { error: "Catalog node not found" },
          { status: 400 }
        );
      }
      if (!filterNode.isActive) {
        return NextResponse.json(
          { error: "Catalog node filter must reference an active node" },
          { status: 400 }
        );
      }
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        select: {
          id: true,
          sku: true,
          name: true,
          fabricType: true,
          category: { select: { id: true, name: true } },
          catalogAssignments: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              id: true,
              productId: true,
              catalogNodeId: true,
              isFeatured: true,
              displayOrder: true,
              createdAt: true,
              updatedAt: true,
              catalogNode: {
                select: {
                  id: true,
                  label: true,
                  path: true,
                  nodeType: true,
                  isActive: true,
                  isVisible: true,
                },
              },
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    return catalogApiError(error, "Unable to list product assignments");
  }
});

export const POST = withLoggedAdminHandler(async (request: Request) => {
  const access = await requireCatalogAdminApi(request);
  if (!access.ok) return access.response;

  try {
    const body = await request.json().catch(() => null);
    const parsed = createAssignmentsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid assignment request" },
        { status: 400 }
      );
    }

    const productIdInputs = Array.from(
      new Set(
        [parsed.data.productId, ...(parsed.data.productIds || [])].filter(
          (value): value is string => Boolean(value)
        )
      )
    );
    const skuInputs = Array.from(new Set(parsed.data.skus || []));
    const catalogNodeIds = Array.from(
      new Set(parsed.data.catalogNodeIds)
    );

    const productClauses: Prisma.ProductWhereInput[] = [];
    if (productIdInputs.length) {
      productClauses.push({ id: { in: productIdInputs } });
    }
    if (skuInputs.length) {
      productClauses.push({ sku: { in: skuInputs } });
    }

    const [products, nodes] = await Promise.all([
      prisma.product.findMany({
        where: { OR: productClauses },
        select: { id: true, sku: true, name: true },
      }),
      prisma.catalogNode.findMany({
        where: { id: { in: catalogNodeIds } },
        select: { id: true, label: true, path: true, isActive: true },
      }),
    ]);

    const foundProductIds = new Set(products.map((product) => product.id));
    const foundSkus = new Set(products.map((product) => product.sku));
    const unknownProductIds = productIdInputs.filter(
      (id) => !foundProductIds.has(id)
    );
    const unknownSkus = skuInputs.filter((sku) => !foundSkus.has(sku));
    if (unknownProductIds.length || unknownSkus.length) {
      return NextResponse.json(
        {
          error: "One or more products were not found",
          unknownProductIds,
          unknownSkus,
        },
        { status: 400 }
      );
    }

    const foundNodeIds = new Set(nodes.map((node) => node.id));
    const unknownCatalogNodeIds = catalogNodeIds.filter(
      (id) => !foundNodeIds.has(id)
    );
    if (unknownCatalogNodeIds.length) {
      return NextResponse.json(
        {
          error: "One or more catalog nodes were not found",
          unknownCatalogNodeIds,
        },
        { status: 400 }
      );
    }

    const inactiveNodes = nodes.filter((node) => !node.isActive);
    if (inactiveNodes.length) {
      return NextResponse.json(
        {
          error: "Assignments can only be added to active catalog nodes",
          inactiveCatalogNodeIds: inactiveNodes.map((node) => node.id),
        },
        { status: 400 }
      );
    }

    const resolvedProductIds = Array.from(
      new Set(products.map((product) => product.id))
    );
    const assignmentCount = resolvedProductIds.length * catalogNodeIds.length;
    if (assignmentCount > MAX_ASSIGNMENTS_PER_REQUEST) {
      return NextResponse.json(
        {
          error: `A maximum of ${MAX_ASSIGNMENTS_PER_REQUEST} assignments can be created per request`,
        },
        { status: 400 }
      );
    }

    const existing = await prisma.productCatalogAssignment.findMany({
      where: {
        productId: { in: resolvedProductIds },
        catalogNodeId: { in: catalogNodeIds },
      },
      select: {
        id: true,
        productId: true,
        catalogNodeId: true,
      },
    });

    if (existing.length) {
      return NextResponse.json(
        {
          error: "One or more product-to-node assignments already exist",
          duplicates: existing.slice(0, 50),
        },
        { status: 409 }
      );
    }

    const data = resolvedProductIds.flatMap((productId) =>
      catalogNodeIds.map((catalogNodeId) => ({
        productId,
        catalogNodeId,
        isFeatured: parsed.data.isFeatured,
        displayOrder: parsed.data.displayOrder ?? null,
      }))
    );

    await prisma.$transaction(async (transaction) => {
      await transaction.productCatalogAssignment.createMany({ data });
    });

    const created = await prisma.productCatalogAssignment.findMany({
      where: {
        productId: { in: resolvedProductIds },
        catalogNodeId: { in: catalogNodeIds },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        productId: true,
        catalogNodeId: true,
        isFeatured: true,
        displayOrder: true,
        createdAt: true,
        catalogNode: {
          select: { id: true, label: true, path: true },
        },
      },
    });

    createAuditLog({
      userId: access.session.user.id,
      userEmail: access.session.user.email || undefined,
      action: "PRODUCT_UPDATED",
      entity: "ProductCatalogAssignment",
      entityId: created.length === 1 ? created[0]?.id : undefined,
      newValue: {
        operation: "CATALOG_ASSIGNMENTS_CREATED",
        count: created.length,
        productIds: resolvedProductIds,
        catalogNodeIds,
        isFeatured: parsed.data.isFeatured,
        displayOrder: parsed.data.displayOrder ?? null,
        reviewedBulk: Boolean(parsed.data.productIds?.length || parsed.data.skus?.length),
      },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json(
      { assignments: created, count: created.length },
      { status: 201 }
    );
  } catch (error) {
    return catalogApiError(error, "Unable to create catalog assignments");
  }
});
