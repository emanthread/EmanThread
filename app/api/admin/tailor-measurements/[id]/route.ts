import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { unifiedMeasurementSchema, mapToPrismaFields } from "@/lib/validators/measurements-unified";
import { adminTailorRequestFilter } from "@/lib/db-queries";

export const dynamic = "force-dynamic";

const isAdmin = (role?: string | null) =>
  ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(role ?? "");

// GET → full measurement detail (tailor requests only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const measurement = await prisma.measurementProfile.findFirst({
      where: { id, ...adminTailorRequestFilter() },
      include: {
        user: { select: { id: true, email: true, name: true, phone: true } },
      },
    });
    if (!measurement) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ measurement });
  } catch (error) {
    console.error("Admin get tailor measurement error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT → admin edits all measurement fields (tailor requests only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const parsed = unifiedMeasurementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify record exists and is a tailor request before updating
  const existing = await prisma.measurementProfile.findFirst({
    where: { id, ...adminTailorRequestFilter() },
  });
  if (!existing) {
    return NextResponse.json({ error: "Measurement request not found" }, { status: 404 });
  }

  const { deliveryDate, ...rest } = parsed.data;
  const mapped = mapToPrismaFields(parsed.data);
  const measurement = await prisma.measurementProfile.update({
    where: { id },
    data: {
      ...mapped,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
    },
  });
  return NextResponse.json({ measurement });
  } catch (error) {
    console.error("Admin update tailor measurement error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE → admin deletes a tailor measurement request (soft-delete)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  // Verify record exists and is a tailor request before soft-deleting
  const existing = await prisma.measurementProfile.findFirst({
    where: { id, ...adminTailorRequestFilter() },
  });
  if (!existing) {
    return NextResponse.json({ error: "Measurement request not found" }, { status: 404 });
  }

  await prisma.measurementProfile.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete tailor measurement error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH → partial update: status, notes, deliveryDate (tailor requests only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  // Verify record exists and is a tailor request before patching
  const existing = await prisma.measurementProfile.findFirst({
    where: { id, ...adminTailorRequestFilter() },
  });
  if (!existing) {
    return NextResponse.json({ error: "Measurement request not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.status !== undefined) updateData.status = body.status;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if ("deliveryDate" in body)
    updateData.deliveryDate = body.deliveryDate ? new Date(body.deliveryDate) : null;

  const measurement = await prisma.measurementProfile.update({
    where: { id },
    data: updateData,
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
  });
  return NextResponse.json({ measurement });
  } catch (error) {
    console.error("Admin patch tailor measurement error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}