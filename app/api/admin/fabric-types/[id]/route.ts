import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/permissions";
import { withLoggedAdminHandler } from "@/lib/logger";

export const dynamic = "force-dynamic";

const updateFabricTypeSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return false;
  }
  return true;
}

export const PUT = withLoggedAdminHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const result = updateFabricTypeSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.errors[0].message },
      { status: 400 }
    );
  }

  const existing = await prisma.fabricType.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Fabric type not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (result.data.name !== undefined) updateData.name = result.data.name;
  if (result.data.slug !== undefined) updateData.slug = result.data.slug;
  if (result.data.description !== undefined) updateData.description = result.data.description;
  if (result.data.isActive !== undefined) updateData.isActive = result.data.isActive;

  const updated = await prisma.fabricType.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
});

export const DELETE = withLoggedAdminHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.fabricType.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Fabric type not found" }, { status: 404 });
  }

  // Soft-delete: deactivate instead of delete to preserve historical product data
  await prisma.fabricType.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
});