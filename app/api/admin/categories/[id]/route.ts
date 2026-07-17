import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/permissions";
import { withLoggedAdminHandler } from "@/lib/logger";

export const dynamic = "force-dynamic";

const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name is too long").optional(),
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

async function checkAdmin() {
  const session = await auth();
  return Boolean(session?.user && isAdminRole(session.user.role));
}

export const PUT = withLoggedAdminHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const result = categoryUpdateSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.errors[0]?.message || "Invalid category data" },
      { status: 400 }
    );
  }

  const data: Prisma.CategoryUpdateInput = {};
  if (result.data.name !== undefined) data.name = result.data.name;
  if (result.data.description !== undefined) {
    data.description = result.data.description || null;
  }
  if (result.data.image !== undefined) data.image = result.data.image || null;

  try {
    const category = await prisma.category.update({
      where: { id },
      data,
      include: { _count: { select: { products: true } } },
    });

    return NextResponse.json(serializeCategory(category));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 }
      );
    }

    console.error("[admin.categories.PUT]", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
});

export const DELETE = withLoggedAdminHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  if (category._count.products > 0) {
    return NextResponse.json(
      { error: "This category is used by products and cannot be deleted" },
      { status: 409 }
    );
  }

  try {
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin.categories.DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
});
