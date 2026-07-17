import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getAdminProducts, createAdminProduct, createAuditLog } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from '@/lib/utils/errors';
import { adminLimitParam, adminPageParam } from "@/lib/admin-pagination";

export const dynamic = "force-dynamic";

const createProductSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  slug: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  longDescription: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  originalPrice: z.number().positive().optional(),
  fabricType: z.string().min(1, "Fabric type is required"),
  color: z.string().min(1, "Color is required"),
  colorHex: z.string().min(1, "Color hex is required"),
  images: z.array(z.string().min(1)).min(1, "At least one image is required"),
  videoUrl: z.string().optional(),
  tags: z.array(z.string()).optional(),
  badge: z.enum(["NEW", "TRENDING", "HOT", "LIMITED", "FEATURED"]).optional(),
  inStock: z.boolean().default(true),
  stockQuantity: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(1).default(5),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
});

// Returns the session if the user is an admin, null otherwise.
// Reusing the return value avoids additional auth() calls within the same request.
async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return null;
  }
  return session;
}

export const GET = withLoggedAdminHandler(async (req: Request) => {
  // Single auth() call — session verified once, not twice.
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = adminPageParam(searchParams.get('page'));
  const limit = adminLimitParam(searchParams.get('limit'), 50);
  const search = searchParams.get('search') || undefined;
  const category = searchParams.get('category') || undefined;
  const stock = searchParams.get('stock') || undefined;

  const result = await getAdminProducts(page, limit, search, category, stock);
  return NextResponse.json(result);
});

export const POST = withLoggedAdminHandler(async (req: Request) => {
  // Obtain session once — reused for both the auth gate and the audit log.
  const session = await checkAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const result = createProductSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.errors[0].message },
      { status: 400 }
    );
  }

  try {
    const product = await createAdminProduct(result.data);

    // Audit log — reuse session obtained above, no extra auth() call needed.
    void createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      action: "PRODUCT_CREATED",
      entity: "Product",
      entityId: product.id,
      newValue: { name: product.name, sku: product.sku, price: product.price },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
