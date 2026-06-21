import { isAdminRole } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAdminCustomers } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

export const GET = withLoggedAdminHandler(async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Support server-side pagination and search
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const result = await getAdminCustomers({ page, limit, search, status });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin customers error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
