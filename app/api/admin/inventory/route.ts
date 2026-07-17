import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAdminProductsWithStock } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from '@/lib/utils/errors';
import { adminLimitParam, adminPageParam } from "@/lib/admin-pagination";

export const dynamic = "force-dynamic";

export const GET = withLoggedAdminHandler(async (req: Request) => {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = adminPageParam(searchParams.get("page"));
    const limit = adminLimitParam(searchParams.get("limit"), 50);

    const result = await getAdminProductsWithStock({ page, limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Get inventory error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
