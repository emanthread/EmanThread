import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAdminProductsWithStock } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";

export const dynamic = "force-dynamic";

export const GET = withLoggedAdminHandler(async () => {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const products = await getAdminProductsWithStock();
    return NextResponse.json(products);
  } catch (error) {
    console.error("Get inventory error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});