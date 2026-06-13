import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/permissions";
import { createAuditLog } from "@/lib/db-queries";
import { prisma } from "@/lib/db";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

const updateNoteSchema = z.object({
  note: z.string().max(500, "Note cannot exceed 500 characters"),
});

export const PATCH = withLoggedAdminHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const result = updateNoteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    // Get old order notes and order number for audit log
    const oldOrder = await prisma.order.findUnique({
      where: { id },
      select: { notes: true, orderNumber: true },
    });

    if (!oldOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { notes: result.data.note },
      select: { id: true, notes: true, orderNumber: true },
    });

    // Write to audit log
    void createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      action: "ORDER_STATUS_CHANGED",
      entity: "Order",
      entityId: id,
      oldValue: { notes: oldOrder.notes },
      newValue: { notes: result.data.note, orderNumber: oldOrder.orderNumber },
    });

    return NextResponse.json({ success: true, notes: updated.notes });
  } catch (error) {
    console.error("Update order note error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
