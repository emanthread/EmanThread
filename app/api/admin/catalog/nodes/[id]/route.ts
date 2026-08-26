import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/db/audit";
import { getClientIp } from "@/lib/client-ip";
import { withLoggedAdminHandler } from "@/lib/logger";
import {
  buildCatalogNodePath,
  catalogApiError,
  catalogRecordIdSchema,
  CatalogNodeMutationError,
  requireCatalogAdminApi,
  updateCatalogNodeSchema,
} from "../../_shared";

export const dynamic = "force-dynamic";

const nodeSummarySelect = {
  id: true,
  parentId: true,
  nodeType: true,
  productKind: true,
  label: true,
  slug: true,
  path: true,
  description: true,
  bannerImage: true,
  bannerAlt: true,
  displayOrder: true,
  isActive: true,
  isVisible: true,
  _count: { select: { assignments: true, children: true } },
} as const;

async function parseNodeId(
  params: Promise<{ id: string }>
): Promise<string | null> {
  const parsed = catalogRecordIdSchema.safeParse((await params).id);
  return parsed.success ? parsed.data : null;
}

type ParentChainNode = {
  id: string;
  parentId: string | null;
  path: string;
  isActive: boolean;
  isVisible: boolean;
};

type CatalogTransactionClient = Pick<Prisma.TransactionClient, "catalogNode">;

async function getParentChain(
  transaction: CatalogTransactionClient,
  parentId: string | null,
  disallowedId?: string
): Promise<ParentChainNode[] | null> {
  const chain: ParentChainNode[] = [];
  const seen = new Set<string>();
  let currentId = parentId;

  while (currentId) {
    if (seen.has(currentId) || currentId === disallowedId) {
      return null;
    }
    seen.add(currentId);

    const current = await transaction.catalogNode.findUnique({
      where: { id: currentId },
      select: {
        id: true,
        parentId: true,
        path: true,
        isActive: true,
        isVisible: true,
      },
    });
    if (!current) return null;

    chain.push(current);
    currentId = current.parentId;
  }

  return chain;
}

function hasPublishedParentChain(chain: ParentChainNode[]): boolean {
  return chain.every((node) => node.isActive && node.isVisible);
}

export const GET = withLoggedAdminHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const access = await requireCatalogAdminApi(request);
    if (!access.ok) return access.response;

    const id = await parseNodeId(params);
    if (!id) {
      return NextResponse.json(
        { error: "Invalid node ID" },
        { status: 400 }
      );
    }

    try {
      const node = await prisma.catalogNode.findUnique({
        where: { id },
        select: {
          id: true,
          parentId: true,
          nodeType: true,
          productKind: true,
          label: true,
          slug: true,
          path: true,
          description: true,
          bannerImage: true,
          bannerAlt: true,
          displayOrder: true,
          isActive: true,
          isVisible: true,
          createdAt: true,
          updatedAt: true,
          parent: {
            select: { id: true, label: true, path: true },
          },
          children: {
            orderBy: [{ displayOrder: "asc" }, { label: "asc" }],
            select: {
              id: true,
              label: true,
              path: true,
              nodeType: true,
              productKind: true,
              displayOrder: true,
              isActive: true,
              isVisible: true,
              _count: { select: { assignments: true } },
            },
          },
          _count: { select: { assignments: true, children: true } },
        },
      });

      if (!node) {
        return NextResponse.json(
          { error: "Catalog node not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ node });
    } catch (error) {
      return catalogApiError(error, "Unable to load catalog node");
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

    const id = await parseNodeId(params);
    if (!id) {
      return NextResponse.json({ error: "Invalid node ID" }, { status: 400 });
    }

    try {
      const body = await request.json().catch(() => null);
      const parsed = updateCatalogNodeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.errors[0]?.message || "Invalid catalog update" },
          { status: 400 }
        );
      }

      const input = parsed.data;
      const { existing, updated } = await prisma.$transaction(
        async (transaction) => {
          const existing = await transaction.catalogNode.findUnique({
            where: { id },
            select: nodeSummarySelect,
          });
          if (!existing) {
            throw new CatalogNodeMutationError("Catalog node not found", 404);
          }

          if (
            input.productKind !== undefined &&
            input.productKind !== existing.productKind
          ) {
            const primaryAssignment =
              await transaction.productCatalogAssignment.findFirst({
                where: { catalogNodeId: id, isPrimary: true },
                select: { id: true },
              });
            if (primaryAssignment) {
              throw new CatalogNodeMutationError(
                "Move products to a different primary category before changing this category's product behavior.",
                409
              );
            }
          }

          const targetParentId =
            input.parentId === undefined ? existing.parentId : input.parentId;
          const targetSlug =
            input.slug === undefined ? existing.slug : input.slug;
          const targetActive =
            input.isActive === undefined ? existing.isActive : input.isActive;
          const targetVisible =
            input.isVisible === undefined ? existing.isVisible : input.isVisible;

          if (
            targetParentId &&
            targetParentId !== existing.parentId
          ) {
            const parentPrimaryAssignment =
              await transaction.productCatalogAssignment.findFirst({
                where: {
                  catalogNodeId: targetParentId,
                  isPrimary: true,
                },
                select: { id: true },
              });
            if (parentPrimaryAssignment) {
              throw new CatalogNodeMutationError(
                "This parent is a product's primary subcategory. Reassign that product before adding child paths.",
                409
              );
            }
          }

          if (targetVisible && !targetActive) {
            throw new CatalogNodeMutationError(
              "A visible catalog path must also be active",
              400
            );
          }

          const parentChain = await getParentChain(
            transaction,
            targetParentId,
            id
          );
          if (targetParentId && !parentChain) {
            throw new CatalogNodeMutationError(
              "The selected parent is missing or would create a catalog cycle",
              400
            );
          }

          const needsPublishedParentCheck =
            targetVisible &&
            (!existing.isVisible ||
              (input.isActive === true && !existing.isActive) ||
              targetParentId !== existing.parentId);
          if (
            needsPublishedParentCheck &&
            !hasPublishedParentChain(parentChain || [])
          ) {
            throw new CatalogNodeMutationError(
              "Publish every parent catalog path before making this child visible",
              409
            );
          }

          const targetPath = buildCatalogNodePath(
            parentChain?.[0]?.path ?? null,
            targetSlug
          );
          const pathChanged = targetPath !== existing.path;

          if (pathChanged && existing._count.children > 0) {
            throw new CatalogNodeMutationError(
              "This path has child paths. Move or remove the child paths first; their public routes are never rewritten automatically.",
              409
            );
          }

          if (pathChanged && existing._count.assignments > 0) {
            throw new CatalogNodeMutationError(
              "This path has product assignments. Create a new staged path and move assignments deliberately; an assigned catalog route is never moved automatically.",
              409
            );
          }

          if (pathChanged && (targetActive || targetVisible)) {
            throw new CatalogNodeMutationError(
              "Deactivate and hide this path before changing its parent or slug so a live catalog route is not moved unexpectedly.",
              409
            );
          }

          if (!targetActive && existing.isActive) {
            const activeChild = await transaction.catalogNode.findFirst({
              where: { parentId: id, isActive: true },
              select: { id: true },
            });
            if (activeChild) {
              throw new CatalogNodeMutationError(
                "Deactivate child paths before deactivating this parent path",
                409
              );
            }
          }

          if (!targetVisible && existing.isVisible) {
            const visibleChild = await transaction.catalogNode.findFirst({
              where: { parentId: id, isVisible: true },
              select: { id: true },
            });
            if (visibleChild) {
              throw new CatalogNodeMutationError(
                "Hide child paths before hiding this parent path",
                409
              );
            }
          }

          const updated = await transaction.catalogNode.update({
            where: { id },
            data: {
              ...(input.parentId === undefined
                ? {}
                : { parentId: targetParentId }),
              ...(input.nodeType === undefined
                ? {}
                : { nodeType: input.nodeType }),
              ...(input.productKind === undefined
                ? {}
                : { productKind: input.productKind }),
              ...(input.label === undefined ? {} : { label: input.label }),
              ...(input.slug === undefined ? {} : { slug: targetSlug }),
              ...(pathChanged ? { path: targetPath } : {}),
              ...(input.description === undefined
                ? {}
                : { description: input.description }),
              ...(input.bannerImage === undefined
                ? {}
                : { bannerImage: input.bannerImage }),
              ...(input.bannerAlt === undefined
                ? {}
                : { bannerAlt: input.bannerAlt }),
              ...(input.displayOrder === undefined
                ? {}
                : { displayOrder: input.displayOrder }),
              ...(input.isActive === undefined
                ? {}
                : { isActive: targetActive }),
              ...(input.isVisible === undefined
                ? {}
                : { isVisible: targetVisible }),
            },
            select: nodeSummarySelect,
          });

          return { existing, updated };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5_000,
          timeout: 10_000,
        }
      );

      createAuditLog({
        userId: access.session.user.id,
        userEmail: access.session.user.email || undefined,
        action: "PRODUCT_UPDATED",
        entity: "CatalogNode",
        entityId: id,
        oldValue: {
          operation: "CATALOG_NODE_UPDATED",
          parentId: existing.parentId,
          nodeType: existing.nodeType,
          productKind: existing.productKind,
          label: existing.label,
          slug: existing.slug,
          path: existing.path,
          description: existing.description,
          bannerImage: existing.bannerImage,
          bannerAlt: existing.bannerAlt,
          displayOrder: existing.displayOrder,
          isActive: existing.isActive,
          isVisible: existing.isVisible,
        },
        newValue: {
          operation: "CATALOG_NODE_UPDATED",
          parentId: updated.parentId,
          nodeType: updated.nodeType,
          productKind: updated.productKind,
          label: updated.label,
          slug: updated.slug,
          path: updated.path,
          description: updated.description,
          bannerImage: updated.bannerImage,
          bannerAlt: updated.bannerAlt,
          displayOrder: updated.displayOrder,
          isActive: updated.isActive,
          isVisible: updated.isVisible,
        },
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
      });

      revalidateTag("catalog-navigation", { expire: 0 });
      revalidatePath("/", "layout");

      return NextResponse.json({ node: updated });
    } catch (error) {
      return catalogApiError(error, "Unable to update catalog path");
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

    const id = await parseNodeId(params);
    if (!id) {
      return NextResponse.json({ error: "Invalid node ID" }, { status: 400 });
    }

    try {
      const existing = await prisma.catalogNode.findUnique({
        where: { id },
        select: nodeSummarySelect,
      });
      if (!existing) {
        return NextResponse.json(
          { error: "Catalog node not found" },
          { status: 404 }
        );
      }

      if (existing._count.children || existing._count.assignments) {
        return NextResponse.json(
          {
            error:
              "This catalog path cannot be deleted while it has child paths or product assignments. Hide or deactivate it instead, or remove those links deliberately first.",
            childCount: existing._count.children,
            assignmentCount: existing._count.assignments,
          },
          { status: 409 }
        );
      }

      // The relation filters make deletion conditional at write time. This
      // prevents a concurrently-created child or assignment from being
      // cascaded away by a stale manager screen.
      const deleted = await prisma.catalogNode.deleteMany({
        where: {
          id,
          children: { none: {} },
          assignments: { none: {} },
        },
      });

      if (deleted.count !== 1) {
        return NextResponse.json(
          {
            error:
              "This catalog path changed before deletion. Refresh it and remove child paths or assignments deliberately first.",
          },
          { status: 409 }
        );
      }

      createAuditLog({
        userId: access.session.user.id,
        userEmail: access.session.user.email || undefined,
        action: "PRODUCT_UPDATED",
        entity: "CatalogNode",
        entityId: id,
        oldValue: {
          operation: "CATALOG_NODE_DELETED",
          parentId: existing.parentId,
          nodeType: existing.nodeType,
          label: existing.label,
          slug: existing.slug,
          path: existing.path,
        },
        newValue: { operation: "CATALOG_NODE_DELETED", deleted: true },
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
      });

      revalidateTag("catalog-navigation", { expire: 0 });
      revalidatePath("/", "layout");

      return NextResponse.json({ success: true });
    } catch (error) {
      return catalogApiError(error, "Unable to delete catalog path");
    }
  }
);
