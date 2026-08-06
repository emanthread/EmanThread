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
} from "../../_shared";

export const dynamic = "force-dynamic";

const updateAssignmentSchema = z
  .object({
    isFeatured: z.boolean().optional(),
    displayOrder: z.number().int().min(0).max(1_000_000).nullable().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.isFeatured !== undefined || value.displayOrder !== undefined,
    "Provide isFeatured or displayOrder"
  );

async function parseAssignmentId(
  params: Promise<{ id: string }>
): Promise<string | null> {
  const parsed = catalogRecordIdSchema.safeParse((await params).id);
  return parsed.success ? parsed.data : null;
}

const assignmentSelect = {
  id: true,
  productId: true,
  catalogNodeId: true,
  isPrimary: true,
  isFeatured: true,
  displayOrder: true,
  createdAt: true,
  updatedAt: true,
  product: {
    select: {
      id: true,
      sku: true,
      name: true,
      fabricType: true,
      category: { select: { id: true, name: true } },
      commerceProfile: { select: { productKind: true } },
    },
  },
  catalogNode: {
    select: {
      id: true,
      label: true,
      path: true,
      nodeType: true,
      productKind: true,
      isActive: true,
      isVisible: true,
    },
  },
} as const;

export const GET = withLoggedAdminHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const access = await requireCatalogAdminApi(request);
    if (!access.ok) return access.response;

    const id = await parseAssignmentId(params);
    if (!id) {
      return NextResponse.json(
        { error: "Invalid assignment ID" },
        { status: 400 }
      );
    }

    try {
      const assignment = await prisma.productCatalogAssignment.findUnique({
        where: { id },
        select: assignmentSelect,
      });

      if (!assignment) {
        return NextResponse.json(
          { error: "Catalog assignment not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ assignment });
    } catch (error) {
      return catalogApiError(error, "Unable to load catalog assignment");
    }
  }
);

export const PATCH = withLoggedAdminHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const access = await requireCatalogAdminApi(request);
    if (!access.ok) return access.response;

    const id = await parseAssignmentId(params);
    if (!id) {
      return NextResponse.json(
        { error: "Invalid assignment ID" },
        { status: 400 }
      );
    }

    try {
      const body = await request.json().catch(() => null);
      const parsed = updateAssignmentSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.errors[0]?.message || "Invalid update" },
          { status: 400 }
        );
      }

      const existing = await prisma.productCatalogAssignment.findUnique({
        where: { id },
        select: assignmentSelect,
      });
      if (!existing) {
        return NextResponse.json(
          { error: "Catalog assignment not found" },
          { status: 404 }
        );
      }
      if (!existing.catalogNode.isActive) {
        return NextResponse.json(
          { error: "Assignments on inactive catalog nodes cannot be updated" },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const assignment = await tx.productCatalogAssignment.update({
          where: { id },
          data: {
            ...(parsed.data.isFeatured === undefined
              ? {}
              : { isFeatured: parsed.data.isFeatured }),
            ...(parsed.data.displayOrder === undefined
              ? {}
              : { displayOrder: parsed.data.displayOrder }),
          },
          select: assignmentSelect,
        });
        await tx.product.update({
          where: { id: existing.productId },
          data: { updatedAt: new Date() },
        });
        return assignment;
      });

      createAuditLog({
        userId: access.session.user.id,
        userEmail: access.session.user.email || undefined,
        action: "PRODUCT_UPDATED",
        entity: "ProductCatalogAssignment",
        entityId: id,
        oldValue: {
          operation: "CATALOG_ASSIGNMENT_UPDATE",
          productId: existing.productId,
          catalogNodeId: existing.catalogNodeId,
          isFeatured: existing.isFeatured,
          displayOrder: existing.displayOrder,
        },
        newValue: {
          operation: "CATALOG_ASSIGNMENT_UPDATED",
          productId: updated.productId,
          catalogNodeId: updated.catalogNodeId,
          isFeatured: updated.isFeatured,
          displayOrder: updated.displayOrder,
        },
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
      });

      return NextResponse.json({ assignment: updated });
    } catch (error) {
      return catalogApiError(error, "Unable to update catalog assignment");
    }
  }
);

export const DELETE = withLoggedAdminHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const access = await requireCatalogAdminApi(request);
    if (!access.ok) return access.response;

    const id = await parseAssignmentId(params);
    if (!id) {
      return NextResponse.json(
        { error: "Invalid assignment ID" },
        { status: 400 }
      );
    }

    try {
      const existing = await prisma.productCatalogAssignment.findUnique({
        where: { id },
        select: assignmentSelect,
      });
      if (!existing) {
        return NextResponse.json(
          { error: "Catalog assignment not found" },
          { status: 404 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.productCatalogAssignment.delete({ where: { id } });
        if (existing.isPrimary) {
          const nextAssignment = await tx.productCatalogAssignment.findFirst({
            where: {
              productId: existing.productId,
              catalogNode: {
                isActive: true,
                productKind: existing.product.commerceProfile
                  ? existing.product.commerceProfile.productKind
                  : { not: null },
                children: { none: {} },
              },
            },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: { id: true },
          });
          if (nextAssignment) {
            await tx.productCatalogAssignment.update({
              where: { id: nextAssignment.id },
              data: { isPrimary: true },
            });
          }
        }
        await tx.product.update({
          where: { id: existing.productId },
          data: { updatedAt: new Date() },
        });
      });

      createAuditLog({
        userId: access.session.user.id,
        userEmail: access.session.user.email || undefined,
        action: "PRODUCT_UPDATED",
        entity: "ProductCatalogAssignment",
        entityId: id,
        oldValue: {
          operation: "CATALOG_ASSIGNMENT_REMOVED",
          productId: existing.productId,
          productSku: existing.product.sku,
          catalogNodeId: existing.catalogNodeId,
          catalogPath: existing.catalogNode.path,
          isFeatured: existing.isFeatured,
          displayOrder: existing.displayOrder,
        },
        newValue: {
          operation: "CATALOG_ASSIGNMENT_DELETED",
          deleted: true,
        },
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      return catalogApiError(error, "Unable to remove catalog assignment");
    }
  }
);
