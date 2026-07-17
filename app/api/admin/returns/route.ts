import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAdminReturnRequests } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from '@/lib/utils/errors';
import { adminLimitParam, adminPageParam } from "@/lib/admin-pagination";

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
    const page = adminPageParam(searchParams.get("page"));
    const limit = adminLimitParam(searchParams.get("limit"), 20);

    const result = await getAdminReturnRequests({ status, search, page, limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin returns error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
