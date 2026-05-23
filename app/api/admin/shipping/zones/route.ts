import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  getAllShippingZones,
  createShippingZone,
} from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";

export const dynamic = "force-dynamic";

const createZoneSchema = z.object({
  name: z.string().min(1, "Zone name is required"),
  cities: z.array(z.string()).default([]),
  provinces: z.array(z.string()).default([]),
  shippingRate: z.number().int().min(0, "Shipping rate must be non-negative"),
  estimatedDays: z.string().min(1, "Estimated days is required"),
  isActive: z.boolean().optional(),
});

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return false;
  }
  return true;
}

export const GET = withLoggedAdminHandler(async () => {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const zones = await getAllShippingZones();
    return NextResponse.json({ zones });
  } catch (error) {
    console.error("Get shipping zones error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withLoggedAdminHandler(async (req: Request) => {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = createZoneSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const zone = await createShippingZone(result.data);
    return NextResponse.json(zone, { status: 201 });
  } catch (error) {
    console.error("Create shipping zone error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});