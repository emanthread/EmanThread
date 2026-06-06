import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const isAdmin = (role?: string | null) =>
  ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(role ?? "");

export async function GET() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    totalMeasurements,
    totalTailorRequests,
    pendingRequests,
    completeRequests,
  ] = await Promise.all([
    prisma.measurementProfile.count({ where: { deletedAt: null } }),
    prisma.measurementProfile.count({ where: { deletedAt: null } }),
    prisma.measurementProfile.count({ where: { status: "pending", deletedAt: null } }),
    prisma.measurementProfile.count({ where: { status: "complete", deletedAt: null } }),
  ]);

  return NextResponse.json({
    totalProfiles: totalMeasurements,
    totalTailorRequests,
    pendingRequests,
    completeRequests,
  });
}
