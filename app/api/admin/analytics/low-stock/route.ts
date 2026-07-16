import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { unstable_cache } from "next/cache";
import { getAdminLowStockProducts } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

// Cached for 60 seconds — good enough for a dashboard preview card.
// Only fetched on-demand (dashboard mount), not bundled into any polling loop.
const getCachedLowStockProducts = unstable_cache(
  async () => getAdminLowStockProducts(),
  ["admin-low-stock-products"],
  { revalidate: 60, tags: ["admin-low-stock-products"] }
);

export const GET = withLoggedAdminHandler(async () => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const products = await getCachedLowStockProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error("Admin low stock products error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
