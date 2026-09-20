import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminProfileFilter, adminCompletedFilter, adminRejectedFilter } from "@/lib/db-queries";
import { requireAdminApiAccess } from "@/lib/admin-route-guard";

export const dynamic = "force-dynamic";

const getCachedAdminMeasurementStats = unstable_cache(
  async () => {
    const [totalProfiles, completedCount, rejectedCount] = await Promise.all([
      prisma.measurementProfile.count({ where: adminProfileFilter() }),
      prisma.measurementProfile.count({ where: adminCompletedFilter() }),
      prisma.measurementProfile.count({ where: adminRejectedFilter() }),
    ]);

    return { totalProfiles, completedCount, rejectedCount };
  },
  ["admin-measurement-stats"],
  { revalidate: 15, tags: ["admin-measurement-stats"] }
);

export async function GET(req: Request) {
  try {
    const access = await requireAdminApiAccess(req);
    if (!access.ok) return access.response;

    return NextResponse.json(await getCachedAdminMeasurementStats());
  } catch (error) {
    console.error("Admin measurement stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
