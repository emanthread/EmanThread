import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/db-queries";
import { requireAdminApiAccess } from "@/lib/admin-route-guard";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  capacity: z.number().int().min(1).max(500).nullable().optional(),
  label: z.string().max(120).nullable().optional(),
}).strict();

// PATCH /api/admin/stitching-calendar/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAdminApiAccess(req);
  if (!access.ok) return access.response;
  const user = access.session.user;

  try {
    const body = await req.json();
    const result = patchSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { id } = await params;
    const existing = await prisma.stitchingCalendarRule.findUnique({
      where: { id },
      select: { type: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }
    if (
      (existing.type === "CAPACITY_OVERRIDE" || existing.type === "CAPACITY_RANGE") &&
      result.data.capacity === null
    ) {
      return NextResponse.json(
        { error: "Capacity rules must keep a capacity value" },
        { status: 400 }
      );
    }

    const updated = await prisma.stitchingCalendarRule.update({
      where: { id },
      data: result.data,
    });

    void createAuditLog({
      userId: user.id,
      userEmail: user.email || undefined,
      action: "SETTINGS_CHANGED",
      entity: "StitchingCalendarRule",
      entityId: id,
      newValue: result.data,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }
    console.error("[stitching-calendar/[id]] PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/stitching-calendar/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAdminApiAccess(req);
  if (!access.ok) return access.response;
  const user = access.session.user;

  try {
    const { id } = await params;
    await prisma.stitchingCalendarRule.delete({
      where: { id },
    });

    void createAuditLog({
      userId: user.id,
      userEmail: user.email || undefined,
      action: "SETTINGS_CHANGED",
      entity: "StitchingCalendarRule",
      entityId: id,
      newValue: { deleted: true },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }
    console.error("[stitching-calendar/[id]] DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
