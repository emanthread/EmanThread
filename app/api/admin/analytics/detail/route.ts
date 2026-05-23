import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAdminAnalyticsDetail } from "@/lib/db-queries";
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
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const data = await getAdminAnalyticsDetail(timeRange, fromDate || undefined, toDate || undefined);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin analytics detail error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
});