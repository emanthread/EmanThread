import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withLoggedAdminHandler } from "@/lib/logger";
import {
  catalogApiError,
  catalogRecordIdSchema,
  requireCatalogAdminApi,
} from "../../_shared";

export const dynamic = "force-dynamic";

export const GET = withLoggedAdminHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const access = await requireCatalogAdminApi(request);
    if (!access.ok) return access.response;

    const parsedId = catalogRecordIdSchema.safeParse((await params).id);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: parsedId.error.errors[0]?.message || "Invalid node ID" },
        { status: 400 }
      );
    }

    try {
      const node = await prisma.catalogNode.findUnique({
        where: { id: parsedId.data },
        select: {
          id: true,
          parentId: true,
          nodeType: true,
          label: true,
          slug: true,
          path: true,
          description: true,
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

