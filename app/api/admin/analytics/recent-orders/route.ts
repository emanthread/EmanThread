import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { unstable_cache } from "next/cache";
import { getAdminRecentOrders } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

// Cached for 60 seconds — stale recent orders are fine for the dashboard preview.
// Only fetched on-demand (on mount of the dashboard page), not on every analytics poll.
const getCachedRecentOrders = unstable_cache(
  async () => getAdminRecentOrders(),
  ["admin-recent-orders"],
  { revalidate: 60, tags: ["admin-recent-orders"] }
);

export const GET = withLoggedAdminHandler(async () => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orders = await getCachedRecentOrders();
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Admin recent orders error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
