import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { createAuditLog } from "@/lib/db-queries";

export const dynamic = "force-dynamic";

async function checkAdmin() {
  const session = await auth();
  if (
    !session?.user ||
    !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role ?? "")
  ) {
    return null;
  }
  return session.user;
}

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  capacity: z.number().int().min(0).max(500).nullable().optional(),
  label: z.string().max(120).nullable().optional(),
});

// PATCH /api/admin/stitching-calendar/[id]
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const result = patchSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const updated = await prisma.stitchingCalendarRule.update({
      where: { id: params.id },
      data: result.data,
    });

    void createAuditLog({
      userId: user.id,
      userEmail: user.email || undefined,
      action: "SETTINGS_CHANGED",
      entity: "StitchingCalendarRule",
      entityId: params.id,
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
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await prisma.stitchingCalendarRule.delete({
      where: { id: params.id },
    });

    void createAuditLog({
      userId: user.id,
      userEmail: user.email || undefined,
      action: "SETTINGS_CHANGED",
      entity: "StitchingCalendarRule",
      entityId: params.id,
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
