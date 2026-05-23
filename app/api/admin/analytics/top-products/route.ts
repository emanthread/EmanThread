import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTopProducts } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";

export const dynamic = "force-dynamic";

export const GET = withLoggedAdminHandler(async () => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const topProducts = await getTopProducts(5);
    return NextResponse.json(topProducts);
  } catch (error) {
    console.error("Admin top products error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
