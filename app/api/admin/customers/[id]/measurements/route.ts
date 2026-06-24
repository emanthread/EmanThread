import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminRole, hasPermission } from "@/lib/permissions";
import { withLoggedAdminHandler } from "@/lib/logger";
import { unifiedMeasurementSchema, mapToPrismaFields } from "@/lib/validators/measurements-unified";

export const dynamic = "force-dynamic";

export const GET = withLoggedAdminHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasPermission(session.user.role, "MANAGE_CUSTOMERS", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Strict privacy filter: ONLY return admin-created profiles
    const profiles = await prisma.measurementProfile.findMany({
      where: {
        userId: id,
        status: "approved",
        source: "profile",
        profileName: "Admin Default",
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("Error fetching admin-created measurements:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const POST = withLoggedAdminHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasPermission(session.user.role, "MANAGE_CUSTOMERS", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    
    // Enforce 1 admin default per customer: mark previous admin defaults as deleted or false?
    // User requested "1 per customer". Let's soft delete previous ones.
    await prisma.measurementProfile.updateMany({
      where: {
        userId: id,
        status: "approved",
        source: "profile",
        profileName: "Admin Default",
        deletedAt: null,
      },
      data: { deletedAt: new Date() }
    });

    const body = await req.json();
    const parsed = unifiedMeasurementSchema.parse(body);

    const newProfile = await prisma.measurementProfile.create({
      data: {
        userId: id,
        isDefault: true,
        status: "approved",
        source: "profile",
        ...mapToPrismaFields(parsed as any),
        profileName: "Admin Default",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "MEASUREMENT_CREATED",
        entity: "MeasurementProfile",
        entityId: newProfile.id,
        newValue: { targetUserId: id, adminCreated: true },
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json({ success: true, profile: newProfile }, { status: 201 });
  } catch (error) {
    console.error("Error creating admin measurement:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
