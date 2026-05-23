import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { updateDiscount, deleteDiscount, createAuditLog } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";

export const dynamic = "force-dynamic";

const updateDiscountSchema = z.object({
  code: z.string().min(1).optional(),
  type: z.enum(["percentage", "fixed", "buy_x_get_y"]).optional(),
  value: z.number().int().min(0).optional(),
  buyQuantity: z.number().int().min(1).optional(),
  getQuantity: z.number().int().min(1).optional(),
  productIds: z.array(z.string()).optional(),
  minPurchase: z.number().int().optional(),
  maxDiscount: z.number().int().optional(),
  usageLimit: z.number().int().optional(),
  startDate: z.string().optional().nullable().transform((v) => v && v.trim() ? v : null),
  endDate: z.string().optional().nullable().transform((v) => v && v.trim() ? v : null),
  isActive: z.boolean().optional(),
});

import { isAdminRole } from "@/lib/permissions"; // C9

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) { // FIXED: C9 — was lowercase "admin"
    return false;
  }
  return true;
}

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
    const result = updateDiscountSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const updated = await updateDiscount(id, result.data);

    // Audit log
    const auditSession = await auth();
    if (auditSession?.user) {
      void createAuditLog({
        userId: auditSession.user.id,
        userEmail: auditSession.user.email || undefined,
        action: "DISCOUNT_UPDATED",
        entity: "Discount",
        entityId: id,
        newValue: { code: updated.code, type: updated.type, value: updated.value, isActive: updated.isActive },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update discount error:", error);
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
    const deleted = await deleteDiscount(id);

    // Audit log
    const auditSession = await auth();
    if (auditSession?.user) {
      void createAuditLog({
        userId: auditSession.user.id,
        userEmail: auditSession.user.email || undefined,
        action: "DISCOUNT_DELETED",
        entity: "Discount",
        entityId: id,
        oldValue: { code: deleted.code, type: deleted.type, value: deleted.value },
        newValue: { isActive: false },
      });
    }

    return NextResponse.json(deleted);
  } catch (error) {
    console.error("Delete discount error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
