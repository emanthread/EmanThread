import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { unstable_cache } from "next/cache";
import { getAdminAnalytics } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

// Cache the heavy 8-query analytics result for 60 seconds.
// Auth is enforced *before* this cache is consulted, so the cached data
// is only ever returned to verified admin users.
// Tag "admin-analytics" allows instant invalidation via revalidateTag()
// from any mutation route (orders, products) in the future.
const getCachedAdminAnalytics = unstable_cache(
  async () => getAdminAnalytics(),
  ["admin-analytics"],
  { revalidate: 60, tags: ["admin-analytics"] }
);

export const GET = withLoggedAdminHandler(async () => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const analytics = await getCachedAdminAnalytics();
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Admin analytics error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
