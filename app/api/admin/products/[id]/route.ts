import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/permissions"; // A3.2
import { getAdminProducts, updateAdminProduct, createAuditLog } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";

export const dynamic = "force-dynamic";

const updateProductSchema = z.object({
  sku: z.string().min(1).optional(),
  slug: z.string().optional(),
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  longDescription: z.string().optional(),
  price: z.number().positive().optional(),
  originalPrice: z.number().positive().optional(),
  fabricType: z.enum(["COTTON", "WASH_AND_WEAR", "BOSKI", "WOOL_BLEND", "KHADDAR"]).optional(),
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

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) { // FIXED: A3.2
    return false;
  }
  return true;
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
    const products = await getAdminProducts();
    const product = products.find((p) => p.id === id);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Get product error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const PUT = withLoggedAdminHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    if (!(await checkAdmin())) {
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

    // Audit log
    const auditSession = await auth();
    if (auditSession?.user) {
      void createAuditLog({
        userId: auditSession.user.id,
        userEmail: auditSession.user.email || undefined,
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
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const DELETE = withLoggedAdminHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Get product name for audit
    const product = await prisma.product.findUnique({
      where: { id },
      select: { name: true, sku: true },
    });

    await prisma.product.update({
      where: { id },
      data: { inStock: false },
    });

    // Audit log
    const auditSession = await auth();
    if (auditSession?.user) {
      void createAuditLog({
        userId: auditSession.user.id,
        userEmail: auditSession.user.email || undefined,
        action: "PRODUCT_DELETED",
        entity: "Product",
        entityId: id,
        oldValue: product ? { name: product.name, sku: product.sku } : undefined,
        newValue: { inStock: false },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
