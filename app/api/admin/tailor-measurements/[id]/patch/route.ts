import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const isAdmin = (role?: string | null) =>
  ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(role ?? "");

const VALID_STATUSES = ["pending", "accepted", "rejected", "complete"] as const;

const patchSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  notes: z.string().max(500).optional(),
  deliveryDate: z.string().nullable().optional(),
});

// PATCH → mark complete / update admin notes / set delivery date
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

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        error: "Invalid status value",
        allowed: VALID_STATUSES,
        details: parsed.error.flatten(),
      }, { status: 400 });
    }

    // Allow partial updates: status, adminNotes, deliveryDate
    const updateData: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
    if (parsed.data.deliveryDate !== undefined)
      updateData.deliveryDate = parsed.data.deliveryDate ? new Date(parsed.data.deliveryDate) : null;

    const measurement = await prisma.measurementProfile.update({
      where: { id },
      data: updateData,
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    });
    return NextResponse.json({ measurement });
  } catch (error) {
    console.error("Admin patch tailor measurement (v2) error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
