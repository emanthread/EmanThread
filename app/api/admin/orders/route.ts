import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAdminOrders } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { hasPermission, type RoleValue } from "@/lib/permissions";
import { adminLimitParam, adminPageParam, adminSearchParam } from "@/lib/admin-pagination";
import { z } from "zod";

export const dynamic = "force-dynamic";

export const GET = withLoggedAdminHandler(async (req: Request) => {
  const session = await auth();
  const userRole = session?.user?.role;
  const userPerms = session?.user?.permissions;
  const customPerms = userPerms ? JSON.stringify(userPerms) : undefined;

  if (
    !session?.user ||
    !hasPermission(userRole as RoleValue, "VIEW_ORDERS", customPerms)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const statusResult = z
    .enum(["pending", "processing", "shipped", "delivered", "cancelled"])
    .optional()
    .safeParse(searchParams.get("status") || undefined);
  if (!statusResult.success) {
    return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
  }
  const status = statusResult.data;
  const search = adminSearchParam(searchParams.get("search"));
  const page = adminPageParam(searchParams.get("page"));
  const limit = adminLimitParam(searchParams.get("limit"), 20);

  const result = await getAdminOrders({ status, search, page, limit });
  return NextResponse.json(result);
});
