import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const isAdmin = (role?: string | null) =>
  ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(role ?? "");

// PATCH → mark complete / update admin notes / set delivery date
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  // Allow partial updates: status, adminNotes, deliveryDate
  const updateData: Record<string, unknown> = {};
  if (body.status !== undefined) updateData.status = body.status;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.deliveryDate !== undefined)
    updateData.deliveryDate = body.deliveryDate ? new Date(body.deliveryDate) : null;

  const measurement = await prisma.measurementProfile.update({
    where: { id },
    data: updateData,
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
  });
  return NextResponse.json({ measurement });
}
