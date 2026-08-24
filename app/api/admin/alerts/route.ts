import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { unstable_cache } from "next/cache";
import { getAdminAlertCounts } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

// Multiple open admin tabs poll this aggregate query. A short cache keeps alert
// badges responsive while preventing duplicate work from exhausting the shared
// database pool.
const getCachedAdminAlertCounts = unstable_cache(
  async () => getAdminAlertCounts(),
  ["admin-alert-counts"],
  { revalidate: 15, tags: ["admin-alert-counts"] }
);

export const GET = withLoggedAdminHandler(async () => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const alerts = await getCachedAdminAlertCounts();
    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Admin alerts error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
