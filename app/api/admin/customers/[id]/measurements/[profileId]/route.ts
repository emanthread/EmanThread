import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminRole, hasPermission } from "@/lib/permissions";
import { withLoggedAdminHandler } from "@/lib/logger";
import { unifiedMeasurementSchema, mapToPrismaFields } from "@/lib/validators/measurements-unified";

export const dynamic = "force-dynamic";

export const PUT = withLoggedAdminHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; profileId: string }> }
) => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasPermission(session.user.role, "MANAGE_CUSTOMERS", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, profileId } = await params;

    const profile = await prisma.measurementProfile.findFirst({
      where: {
        id: profileId,
        userId: id,
        status: "approved",
        source: "profile",
        profileName: "Admin Default",
        deletedAt: null,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Admin profile not found or forbidden" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = unifiedMeasurementSchema.partial().parse(body);

    const updated = await prisma.measurementProfile.update({
      where: { id: profileId },
      data: {
        ...mapToPrismaFields(parsed as any),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "MEASUREMENT_UPDATED",
        entity: "MeasurementProfile",
        details: { profileId, targetUserId: id, adminCreated: true },
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    console.error("Error updating admin measurement:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const DELETE = withLoggedAdminHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; profileId: string }> }
) => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasPermission(session.user.role, "MANAGE_CUSTOMERS", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, profileId } = await params;

    const profile = await prisma.measurementProfile.findFirst({
      where: {
        id: profileId,
        userId: id,
        status: "approved",
        source: "profile",
        profileName: "Admin Default",
        deletedAt: null,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Admin profile not found or forbidden" }, { status: 404 });
    }

    await prisma.measurementProfile.update({
      where: { id: profileId },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "MEASUREMENT_DELETED",
        entity: "MeasurementProfile",
        details: { profileId, targetUserId: id, adminCreated: true },
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting admin measurement:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
