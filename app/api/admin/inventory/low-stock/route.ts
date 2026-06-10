import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLowStockProducts } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

export const GET = withLoggedAdminHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const thresholdParam = searchParams.get("threshold");
    const threshold = thresholdParam ? parseInt(thresholdParam, 10) : undefined;

    const products = await getLowStockProducts(threshold);
    return NextResponse.json(products);
  } catch (error) {
    console.error("Get low stock error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});