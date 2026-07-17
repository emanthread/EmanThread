import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withLoggedAdminHandler } from "@/lib/logger";
import { requireAdminApiAccess } from "@/lib/admin-route-guard";

export const dynamic = "force-dynamic";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
  description: z.string().trim().max(300, "Description is too long").optional(),
  image: z.string().trim().max(500, "Image URL is too long").optional(),
});

function serializeCategory(category: {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  _count?: { products: number };
}) {
  return {
    id: category.id,
    name: category.name,
    description: category.description || "",
    image: category.image || "",
    productCount: category._count?.products ?? 0,
    isActive: true,
  };
}

/**
 * GET /api/admin/categories
 *
 * Returns real Category records from the database with their actual IDs.
 * Used only by admin taxonomy screens and the admin product categoryId field.
 *
 * This remains separate from public /api/categories, which returns
 * fabricType-grouped data for shop sidebar filters.
 */
export const GET = withLoggedAdminHandler(async (req: Request) => {
  const access = await requireAdminApiAccess(req);
  if (!access.ok) return access.response;

  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories.map(serializeCategory));
});

export const POST = withLoggedAdminHandler(async (req: Request) => {
  const access = await requireAdminApiAccess(req);
  if (!access.ok) return access.response;

  const body = await req.json().catch(() => null);
  const result = categorySchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.errors[0]?.message || "Invalid category data" },
      { status: 400 }
    );
  }

  try {
    const category = await prisma.category.create({
      data: {
        name: result.data.name,
        description: result.data.description || null,
        image: result.data.image || null,
      },
      include: { _count: { select: { products: true } } },
    });

    return NextResponse.json(serializeCategory(category), { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 }
      );
    }

    console.error("[admin.categories.POST]", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
});
