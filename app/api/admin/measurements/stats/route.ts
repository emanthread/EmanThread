import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { adminTailorRequestFilter, adminProfileFilter, adminCompletedFilter } from "@/lib/db-queries";

export const dynamic = "force-dynamic";

const isAdmin = (role?: string | null) =>
  ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(role ?? "");

export async function GET() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    totalProfiles,
    totalTailorRequests,
    pendingRequests,
    completeRequests,
    completedCount,
  ] = await Promise.all([
    prisma.measurementProfile.count({ where: adminProfileFilter() }),
    prisma.measurementProfile.count({ where: adminTailorRequestFilter() }),
    prisma.measurementProfile.count({ where: { ...adminTailorRequestFilter(), status: "pending" } }),
    prisma.measurementProfile.count({ where: { ...adminTailorRequestFilter(), status: "complete" } }),
    prisma.measurementProfile.count({ where: adminCompletedFilter() }),
  ]);

  return NextResponse.json({
    totalProfiles,
    totalTailorRequests,
    pendingRequests,
    completeRequests,
    completedCount,
  });
}