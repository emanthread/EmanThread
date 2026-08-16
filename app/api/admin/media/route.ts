import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApiAccess } from "@/lib/admin-route-guard";
import { ARCHIVED_PRODUCT_TAG, visibleProductTags } from "@/lib/product-archive";
import { parseProductImages } from "@/lib/utils/parse-images";
import { sanitizeDbError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

/** Lean media-library read: avoids product-list counts and commerce joins. */
export async function GET(request: Request) {
  const access = await requireAdminApiAccess(request);
  if (!access.ok) return access.response;

  try {
    const products = await prisma.product.findMany({
      where: { NOT: { tags: { contains: ARCHIVED_PRODUCT_TAG } } },
      select: {
        id: true,
        name: true,
        images: true,
        videoUrl: true,
        tags: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(
      products.map((product) => ({
        ...product,
        images: parseProductImages(product.images),
        tags: visibleProductTags(product.tags),
      })),
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
