import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withLoggedAdminHandler } from "@/lib/logger";
import {
  catalogApiError,
  catalogRecordIdSchema,
  requireCatalogAdminApi,
} from "../_shared";

export const dynamic = "force-dynamic";

const nodeQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  active: z.enum(["true", "false", "all"]).default("true"),
  visible: z.enum(["true", "false", "all"]).default("all"),
  parentId: catalogRecordIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(250).default(250),
});

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
        { path: "asc" },
        { displayOrder: "asc" },
        { label: "asc" },
      ],
      select: {
        id: true,
        parentId: true,
        nodeType: true,
        label: true,
        path: true,
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

