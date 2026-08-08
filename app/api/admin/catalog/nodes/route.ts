import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/db/audit";
import { getClientIp } from "@/lib/client-ip";
import { withLoggedAdminHandler } from "@/lib/logger";
import {
  buildCatalogNodePath,
  catalogApiError,
  catalogRecordIdSchema,
  CatalogNodeMutationError,
  createCatalogNodeSchema,
  requireCatalogAdminApi,
} from "../_shared";

export const dynamic = "force-dynamic";

const nodeQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  active: z.enum(["true", "false", "all"]).default("true"),
  visible: z.enum(["true", "false", "all"]).default("all"),
  parentId: catalogRecordIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(1_000).default(250),
});

type CatalogTransactionClient = Pick<Prisma.TransactionClient, "catalogNode">;

async function hasPublishedParentChain(
  transaction: CatalogTransactionClient,
  parentId: string
): Promise<boolean> {
  const seen = new Set<string>();
  let currentId: string | null = parentId;

  while (currentId) {
    if (seen.has(currentId)) return false;
    seen.add(currentId);

    const current: {
      parentId: string | null;
      isActive: boolean;
      isVisible: boolean;
    } | null = await transaction.catalogNode.findUnique({
      where: { id: currentId },
      select: { parentId: true, isActive: true, isVisible: true },
    });
    if (!current || !current.isActive || !current.isVisible) return false;
    currentId = current.parentId;
  }

  return true;
}

export const GET = withLoggedAdminHandler(async (request: Request) => {
  const access = await requireCatalogAdminApi(request);
  if (!access.ok) return access.response;

  const url = new URL(request.url);
  const parsed = nodeQuerySchema.safeParse({
    search: url.searchParams.get("search") || undefined,
    active: url.searchParams.get("active") || undefined,
    visible: url.searchParams.get("visible") || undefined,
    parentId: url.searchParams.get("parentId") || undefined,
    limit: url.searchParams.get("limit") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid query" },
      { status: 400 }
    );
  }

  const { search, active, visible, parentId, limit } = parsed.data;
  const where: Prisma.CatalogNodeWhereInput = {
    ...(active === "all" ? {} : { isActive: active === "true" }),
    ...(visible === "all" ? {} : { isVisible: visible === "true" }),
    ...(parentId ? { parentId } : {}),
    ...(search
      ? {
          OR: [
            { label: { contains: search, mode: "insensitive" } },
            { path: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  try {
    const nodes = await prisma.catalogNode.findMany({
      where,
      take: limit,
      orderBy: [
        { displayOrder: "asc" },
        { path: "asc" },
        { label: "asc" },
      ],
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
        _count: { select: { assignments: true, children: true } },
      },
    });

    return NextResponse.json({ nodes, limit });
  } catch (error) {
    return catalogApiError(error, "Unable to list catalog nodes");
  }
});

export const POST = withLoggedAdminHandler(async (request: Request) => {
  const access = await requireCatalogAdminApi(request);
  if (!access.ok) return access.response;

  try {
    const body = await request.json().catch(() => null);
    const parsed = createCatalogNodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid catalog path" },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const node = await prisma.$transaction(
      async (transaction) => {
        const parent = input.parentId
          ? await transaction.catalogNode.findUnique({
              where: { id: input.parentId },
              select: { id: true, path: true },
            })
          : null;

        if (input.parentId && !parent) {
          throw new CatalogNodeMutationError(
            "The selected parent catalog path was not found",
            400
          );
        }

        if (parent) {
          const parentPrimaryAssignment =
            await transaction.productCatalogAssignment.findFirst({
              where: { catalogNodeId: parent.id, isPrimary: true },
              select: { id: true },
            });
          if (parentPrimaryAssignment) {
            throw new CatalogNodeMutationError(
              "This parent is a product's primary leaf category. Reassign that product before adding child paths.",
              409
            );
          }
        }

        if (
          input.isVisible &&
          input.parentId &&
          !(await hasPublishedParentChain(transaction, input.parentId))
        ) {
          throw new CatalogNodeMutationError(
            "Publish the parent catalog path before making this child visible",
            409
          );
        }

        const path = buildCatalogNodePath(parent?.path ?? null, input.slug);
        return transaction.catalogNode.create({
          data: {
            parentId: input.parentId,
            nodeType: input.nodeType,
            productKind: input.productKind ?? null,
            label: input.label,
            slug: input.slug,
            path,
            description: input.description ?? null,
            bannerImage: input.bannerImage ?? null,
            bannerAlt: input.bannerAlt ?? null,
            displayOrder: input.displayOrder,
            isActive: input.isActive,
            isVisible: input.isVisible,
          },
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
            _count: { select: { assignments: true, children: true } },
          },
        });
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
      entityId: node.id,
      newValue: {
        operation: "CATALOG_NODE_CREATED",
        parentId: node.parentId,
        nodeType: node.nodeType,
        productKind: node.productKind,
        label: node.label,
        slug: node.slug,
        path: node.path,
        description: node.description,
        bannerImage: node.bannerImage,
        bannerAlt: node.bannerAlt,
        displayOrder: node.displayOrder,
        isActive: node.isActive,
        isVisible: node.isVisible,
      },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({ node }, { status: 201 });
  } catch (error) {
    return catalogApiError(error, "Unable to create catalog path");
  }
});
