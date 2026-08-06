import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/db/audit";
import { getClientIp } from "@/lib/client-ip";
import {
  catalogApiError,
  catalogRecordIdSchema,
  CatalogNodeMutationError,
  requireCatalogAdminApi,
} from "../../../_shared";

export const dynamic = "force-dynamic";

const syncSchema = z
  .object({
    assignments: z
      .array(
        z.object({
          catalogNodeId: catalogRecordIdSchema,
          isFeatured: z.boolean(),
          displayOrder: z.number().int().min(0).max(1_000_000).nullable(),
        })
      )
      .max(25),
  })
  .strict()
  .superRefine((value, context) => {
    const seen = new Set<string>();
    for (const [index, assignment] of value.assignments.entries()) {
      if (seen.has(assignment.catalogNodeId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["assignments", index, "catalogNodeId"],
          message: "Each catalog node can be assigned only once",
        });
      }
      seen.add(assignment.catalogNodeId);
    }
  });

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const access = await requireCatalogAdminApi(request);
  if (!access.ok) return access.response;

  const productIdResult = catalogRecordIdSchema.safeParse((await params).productId);
  if (!productIdResult.success) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid catalog assignments" },
      { status: 400 }
    );
  }

  const productId = productIdResult.data;
  const desired = new Map(
    parsed.data.assignments.map((assignment) => [assignment.catalogNodeId, assignment])
  );

  try {
    const assignments = await prisma.$transaction(
      async (tx) => {
        // The Product is read only. Every mutation below targets only the
        // additive ProductCatalogAssignment table.
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: {
            id: true,
            commerceProfile: { select: { productKind: true } },
          },
        });
        if (!product) {
          throw new CatalogNodeMutationError("Product not found", 404);
        }

        const [existing, nodes] = await Promise.all([
          tx.productCatalogAssignment.findMany({
            where: { productId },
            select: {
              catalogNodeId: true,
              isPrimary: true,
              isFeatured: true,
              displayOrder: true,
              catalogNode: { select: { isActive: true } },
            },
          }),
          tx.catalogNode.findMany({
            where: { id: { in: Array.from(desired.keys()) } },
            select: {
              id: true,
              isActive: true,
              productKind: true,
              _count: { select: { children: true } },
            },
          }),
        ]);

        const existingByNodeId = new Map(
          existing.map((assignment) => [assignment.catalogNodeId, assignment])
        );
        const nodesById = new Map(nodes.map((node) => [node.id, node]));
        const primaryCatalogNodeId = parsed.data.assignments[0]?.catalogNodeId;
        const primaryNode = primaryCatalogNodeId
          ? nodesById.get(primaryCatalogNodeId)
          : null;
        if (
          primaryCatalogNodeId &&
          (!primaryNode?.productKind || primaryNode._count.children > 0)
        ) {
          throw new CatalogNodeMutationError(
            "Choose a specific product category first; broad landing pages can only be additional placements",
            400
          );
        }
        if (
          primaryNode?.productKind &&
          product.commerceProfile &&
          product.commerceProfile.productKind !== primaryNode.productKind
        ) {
          throw new CatalogNodeMutationError(
            "The primary category does not match this product type",
            409
          );
        }

        for (const [catalogNodeId, next] of desired) {
          const node = nodesById.get(catalogNodeId);
          if (!node) {
            throw new CatalogNodeMutationError(
              "One or more catalog nodes were not found",
              400
            );
          }

          const current = existingByNodeId.get(catalogNodeId);
          const changed = !current ||
            current.isFeatured !== next.isFeatured ||
            current.displayOrder !== next.displayOrder ||
            current.isPrimary !== (catalogNodeId === primaryCatalogNodeId);
          if (changed && !node.isActive) {
            throw new CatalogNodeMutationError(
              "Assignments can only be added or changed on active catalog nodes",
              400
            );
          }
        }

        const removals = existing
          .filter((assignment) => !desired.has(assignment.catalogNodeId))
          .map((assignment) => assignment.catalogNodeId);
        if (removals.length) {
          await tx.productCatalogAssignment.deleteMany({
            where: { productId, catalogNodeId: { in: removals } },
          });
        }

        await tx.productCatalogAssignment.updateMany({
          where: { productId, isPrimary: true },
          data: { isPrimary: false },
        });

        for (const [catalogNodeId, next] of desired) {
          const current = existingByNodeId.get(catalogNodeId);
          if (!current) continue;
          await tx.productCatalogAssignment.update({
            where: { productId_catalogNodeId: { productId, catalogNodeId } },
            data: {
              isPrimary: catalogNodeId === primaryCatalogNodeId,
              isFeatured: next.isFeatured,
              displayOrder: next.displayOrder,
            },
          });
        }

        const additions = Array.from(desired.values())
          .filter((assignment) => !existingByNodeId.has(assignment.catalogNodeId))
          .map((assignment) => ({
            ...assignment,
            productId,
            isPrimary: assignment.catalogNodeId === primaryCatalogNodeId,
          }));
        if (additions.length) {
          await tx.productCatalogAssignment.createMany({ data: additions });
        }

        await tx.product.update({
          where: { id: productId },
          data: { updatedAt: new Date() },
        });

        return tx.productCatalogAssignment.findMany({
          where: { productId },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            productId: true,
            catalogNodeId: true,
            isPrimary: true,
            isFeatured: true,
            displayOrder: true,
            createdAt: true,
            updatedAt: true,
            catalogNode: {
              select: {
                label: true,
                path: true,
                productKind: true,
                isActive: true,
                isVisible: true,
              },
            },
          },
        });
      },
      { isolationLevel: "Serializable", maxWait: 5_000, timeout: 30_000 }
    );

    createAuditLog({
      userId: access.session.user.id,
      userEmail: access.session.user.email || undefined,
      action: "PRODUCT_UPDATED",
      entity: "ProductCatalogAssignment",
      entityId: productId,
      newValue: {
        operation: "PRODUCT_CATALOG_ASSIGNMENTS_SYNCED",
        productId,
        assignmentCount: assignments.length,
        primaryCatalogNodeId: assignments.find((item) => item.isPrimary)
          ?.catalogNodeId,
      },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    return catalogApiError(error, "Unable to save product catalog assignments");
  }
}
