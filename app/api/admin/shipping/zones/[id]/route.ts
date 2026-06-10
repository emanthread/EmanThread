import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  updateShippingZone,
  deleteShippingZone,
} from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

const updateZoneSchema = z.object({
  name: z.string().min(1, "Zone name is required").optional(),
  cities: z.array(z.string()).optional(),
  provinces: z.array(z.string()).optional(),
  shippingRate: z.number().int().min(0, "Shipping rate must be non-negative").optional(),
  estimatedDays: z.string().min(1, "Estimated days is required").optional(),
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

export const PUT = withLoggedAdminHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const result = updateZoneSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const zone = await updateShippingZone(id, result.data);
    return NextResponse.json(zone);
  } catch (error) {
    console.error("Update shipping zone error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});

export const DELETE = withLoggedAdminHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await deleteShippingZone(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete shipping zone error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});