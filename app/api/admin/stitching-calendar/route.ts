import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/db-queries";
import { requireAdminApiAccess } from "@/lib/admin-route-guard";

export const dynamic = "force-dynamic";

const createRuleSchema = z.object({
  type: z.enum([
    "BLOCKED_DATE",
    "CAPACITY_OVERRIDE",
    "BLOCKED_RANGE",
    "CAPACITY_RANGE",
  ]),
  date: z.string().datetime().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  capacity: z.number().int().min(1).max(500).optional().nullable(),
  label: z.string().trim().max(120).optional().nullable(),
  isActive: z.boolean().optional(),
}).strict();

// GET /api/admin/stitching-calendar — list all rules
export async function GET(req: Request) {
  const access = await requireAdminApiAccess(req);
  if (!access.ok) return access.response;

  try {
    const rules = await prisma.stitchingCalendarRule.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(rules);
  } catch (error) {
    console.error("[stitching-calendar] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/stitching-calendar — create a new rule
export async function POST(req: Request) {
  const access = await requireAdminApiAccess(req);
  if (!access.ok) return access.response;
  const user = access.session.user;

  try {
    const body = await req.json();
    const result = createRuleSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = result.data;

    // Validate: single-day types require date, range types require startDate + endDate
    if (
      (data.type === "BLOCKED_DATE" || data.type === "CAPACITY_OVERRIDE") &&
      !data.date
    ) {
      return NextResponse.json(
        { error: "date is required for single-day rule types" },
        { status: 400 }
      );
    }
    if (
      (data.type === "BLOCKED_RANGE" || data.type === "CAPACITY_RANGE") &&
      (!data.startDate || !data.endDate)
    ) {
      return NextResponse.json(
        { error: "startDate and endDate are required for range rule types" },
        { status: 400 }
      );
    }
    if (
      (data.type === "CAPACITY_OVERRIDE" || data.type === "CAPACITY_RANGE") &&
      data.capacity == null
    ) {
      return NextResponse.json(
        { error: "capacity is required for capacity override rules" },
        { status: 400 }
      );
    }
    if (
      data.startDate &&
      data.endDate &&
      new Date(data.startDate).getTime() > new Date(data.endDate).getTime()
    ) {
      return NextResponse.json(
        { error: "Start date must be on or before end date" },
        { status: 400 }
      );
    }

    const rule = await prisma.stitchingCalendarRule.create({
      data: {
        type: data.type,
        date: data.date ? new Date(data.date) : null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        capacity: data.capacity ?? null,
        label: data.label ?? null,
        isActive: data.isActive ?? true,
      },
    });

    void createAuditLog({
      userId: user.id,
      userEmail: user.email || undefined,
      action: "SETTINGS_CHANGED",
      entity: "StitchingCalendarRule",
      newValue: rule,
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error("[stitching-calendar] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
