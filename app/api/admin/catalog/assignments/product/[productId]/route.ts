import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  catalogApiError,
  catalogRecordIdSchema,
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
          select: { id: true },
        });
        if (!product) {
          throw new Error("Product not found");
        }

        const [existing, nodes] = await Promise.all([
          tx.productCatalogAssignment.findMany({
            where: { productId },
            select: {
              catalogNodeId: true,
              isFeatured: true,
              displayOrder: true,
              catalogNode: { select: { isActive: true } },
            },
          }),
          tx.catalogNode.findMany({
            where: { id: { in: Array.from(desired.keys()) } },
            select: { id: true, isActive: true },
          }),
        ]);

        const existingByNodeId = new Map(
          existing.map((assignment) => [assignment.catalogNodeId, assignment])
        );
        const nodesById = new Map(nodes.map((node) => [node.id, node]));

        for (const [catalogNodeId, next] of desired) {
          const node = nodesById.get(catalogNodeId);
          if (!node) throw new Error("One or more catalog nodes were not found");

          const current = existingByNodeId.get(catalogNodeId);
          const changed = !current ||
            current.isFeatured !== next.isFeatured ||
            current.displayOrder !== next.displayOrder;
          if (changed && !node.isActive) {
            throw new Error("Assignments can only be added or changed on active catalog nodes");
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

        for (const [catalogNodeId, next] of desired) {
          const current = existingByNodeId.get(catalogNodeId);
          if (!current) continue;
          if (
            current.isFeatured !== next.isFeatured ||
            current.displayOrder !== next.displayOrder
          ) {
            await tx.productCatalogAssignment.update({
              where: { productId_catalogNodeId: { productId, catalogNodeId } },
              data: {
                isFeatured: next.isFeatured,
                displayOrder: next.displayOrder,
              },
            });
          }
        }

        const additions = Array.from(desired.values())
          .filter((assignment) => !existingByNodeId.has(assignment.catalogNodeId))
          .map((assignment) => ({ ...assignment, productId }));
        if (additions.length) {
          await tx.productCatalogAssignment.createMany({ data: additions });
        }

        return tx.productCatalogAssignment.findMany({
          where: { productId },
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
                label: true,
                path: true,
                isActive: true,
                isVisible: true,
              },
            },
          },
        });
      },
      { isolationLevel: "Serializable", maxWait: 5_000, timeout: 30_000 }
    );

    return NextResponse.json({ assignments });
  } catch (error) {
    return catalogApiError(error, "Unable to save product catalog assignments");
  }
}
