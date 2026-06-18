import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/permissions";
import { updateAdminProduct, createAuditLog } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from '@/lib/utils/errors';
import { parseProductImages, parseJsonArray } from "@/lib/utils/parse-images";

export const dynamic = "force-dynamic";

const updateProductSchema = z.object({
  sku: z.string().min(1).optional(),
  slug: z.string().optional(),
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  longDescription: z.string().optional(),
  price: z.number().positive().optional(),
  originalPrice: z.number().positive().optional(),
  fabricType: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  colorHex: z.string().min(1).optional(),
  images: z.array(z.string().min(1)).optional(),
  videoUrl: z.string().optional(),
  tags: z.array(z.string()).optional(),
  badge: z.enum(["NEW", "TRENDING", "HOT", "LIMITED", "FEATURED"]).optional(),
  inStock: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(1).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  categoryId: z.string().min(1).optional(),
});

const badgeMap: Record<string, string> = {
  NEW: "New",
  TRENDING: "Trending",
  HOT: "Hot",
  LIMITED: "Limited",
  FEATURED: "Featured",
};

// Returns the session if the user is an admin, null otherwise.
// Reusing the return value avoids additional auth() calls within the same request.
async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return null;
  }
  return session;
}

export const GET = withLoggedAdminHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Direct single-row lookup — avoids loading all products just to find one.
    const p = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        originalPrice: true,
        fabricType: true,
        color: true,
        colorHex: true,
        images: true,
        videoUrl: true,
        badge: true,
        inStock: true,
        stockQuantity: true,
        lowStockThreshold: true,
        description: true,
        longDescription: true,
        categoryId: true,
        slug: true,
        tags: true,
        metaTitle: true,
        metaDescription: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!p) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: Number(p.price),
      originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
      fabricType: p.fabricType || "Cotton",
      color: p.color,
      colorHex: p.colorHex,
      images: parseProductImages(p.images),
      videoUrl: p.videoUrl || undefined,
      badge: p.badge ? badgeMap[p.badge] : undefined,
      inStock: p.inStock,
      stockQuantity: p.stockQuantity,
      lowStockThreshold: p.lowStockThreshold,
      description: p.description,
      longDescription: p.longDescription || "",
      categoryId: p.categoryId,
      slug: p.slug || p.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      tags: parseJsonArray(p.tags),
      metaTitle: p.metaTitle || undefined,
      metaDescription: p.metaDescription || undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Get product error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});

export const PUT = withLoggedAdminHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    // Obtain session once — reused for both the auth gate and the audit log.
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const result = updateProductSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    // Get old product for audit
    const oldProduct = await prisma.product.findUnique({
      where: { id },
      select: { name: true, sku: true, price: true, inStock: true },
    });

    const updated = await updateAdminProduct(id, result.data);

    // Audit log — reuse session obtained above, no extra auth() call needed.
    if (session.user) {
      void createAuditLog({
        userId: session.user.id,
        userEmail: session.user.email || undefined,
        action: "PRODUCT_UPDATED",
        entity: "Product",
        entityId: id,
        oldValue: oldProduct ? { name: oldProduct.name, sku: oldProduct.sku, price: Number(oldProduct.price), inStock: oldProduct.inStock } : undefined,
        newValue: { name: updated.name, sku: updated.sku, price: updated.price, inStock: updated.inStock },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update product error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});

export const DELETE = withLoggedAdminHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    // Obtain session once — reused for both the auth gate and the audit log.
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Get product name for audit
    const product = await prisma.product.findUnique({
      where: { id },
      select: { name: true, sku: true },
    });

    try {
      await prisma.product.delete({
        where: { id },
      });
    } catch (e: any) {
      if (e.code === "P2003") {
        return NextResponse.json(
          { error: "Cannot delete product because it has existing orders. Please edit the product and mark it as 'Out of Stock' instead." },
          { status: 400 }
        );
      }
      throw e;
    }

    // Audit log — reuse session obtained above, no extra auth() call needed.
    if (session.user) {
      void createAuditLog({
        userId: session.user.id,
        userEmail: session.user.email || undefined,
        action: "PRODUCT_DELETED",
        entity: "Product",
        entityId: id,
        oldValue: product ? { name: product.name, sku: product.sku } : undefined,
        newValue: { deleted: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
