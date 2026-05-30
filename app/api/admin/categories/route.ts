import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { withLoggedAdminHandler } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/categories
 *
 * Returns real Category records from the database (with their actual IDs).
 * Used ONLY by the admin product form for the categoryId field.
 *
 * NOTE: This is intentionally separate from the public GET /api/categories,
 * which returns fabricType-grouped data for the shop sidebar filters.
 * Keeping them separate prevents the two concerns from ever conflicting.
 */
export const GET = withLoggedAdminHandler(async () => {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    categories.map((c) => ({
      id: c.id,           // real DB foreign key ID — safe to use as categoryId
      name: c.name,
      description: c.description || "",
      image: c.image || "",
      productCount: c._count.products,
    }))
  );
});
