import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAdminReturnRequests } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";

export const dynamic = "force-dynamic";

export const GET = withLoggedAdminHandler(async (req: Request) => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await getAdminReturnRequests({ status, search, page, limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin returns error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
