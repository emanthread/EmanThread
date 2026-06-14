import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { adminProfileFilter, adminCompletedFilter, adminRejectedFilter } from "@/lib/db-queries";

export const dynamic = "force-dynamic";

const isAdmin = (role?: string | null) =>
  ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(role ?? "");

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [totalProfiles, completedCount, rejectedCount] = await Promise.all([
      prisma.measurementProfile.count({ where: adminProfileFilter() }),
      prisma.measurementProfile.count({ where: adminCompletedFilter() }),
      prisma.measurementProfile.count({ where: adminRejectedFilter() }),
    ]);

    return NextResponse.json({
      totalProfiles,
      completedCount,
      rejectedCount,
    });
  } catch (error) {
    console.error("Admin measurement stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}