import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRevenueOverview } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";

export const dynamic = "force-dynamic";

export const GET = withLoggedAdminHandler(async (request: Request) => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "7d";

    const revenue = await getRevenueOverview(timeRange);
    return NextResponse.json(revenue);
  } catch (error) {
    console.error("Admin revenue analytics error:", error);
    return NextResponse.json([], { status: 200 }); // Return empty array, not error
  }
});
