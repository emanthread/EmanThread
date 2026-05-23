import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getDiscounts, createDiscount, createAuditLog } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";

export const dynamic = "force-dynamic";

const createDiscountSchema = z.object({
  code: z.string().min(1, "Code is required"),
  type: z.enum(["percentage", "fixed", "buy_x_get_y"]),
  value: z.number().int().min(0, "Value must be positive"),
  buyQuantity: z.number().int().min(1).optional(),
  getQuantity: z.number().int().min(1).optional(),
  productIds: z.array(z.string()).optional(),
  minPurchase: z.number().int().optional(),
  maxDiscount: z.number().int().optional(),
  usageLimit: z.number().int().optional(),
  startDate: z.string().optional().transform((v) => v && v.trim() ? v : null),
  endDate: z.string().optional().transform((v) => v && v.trim() ? v : null),
  isActive: z.boolean().default(true),
});

export const GET = withLoggedAdminHandler(async () => {
  try {
    const session = await auth();
      if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const discounts = await getDiscounts();
    return NextResponse.json(discounts);
  } catch (error) {
    console.error("Get discounts error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withLoggedAdminHandler(async (req: Request) => {
  try {
    const session = await auth();
      if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = createDiscountSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const discount = await createDiscount(result.data);

    // Audit log
    void createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      action: "DISCOUNT_CREATED",
      entity: "Discount",
      entityId: discount.id,
      newValue: { code: discount.code, type: discount.type, value: discount.value },
    });

    return NextResponse.json(discount, { status: 201 });
  } catch (error) {
    console.error("Create discount error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
