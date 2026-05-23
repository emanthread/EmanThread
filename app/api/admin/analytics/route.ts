import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAdminAnalytics } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";

export const dynamic = "force-dynamic";

export const GET = withLoggedAdminHandler(async () => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const analytics = await getAdminAnalytics();
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Admin analytics error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
