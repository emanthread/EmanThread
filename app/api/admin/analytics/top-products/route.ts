import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { unstable_cache } from "next/cache";
import { getTopProducts } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

const getCachedTopProducts = unstable_cache(
  async () => getTopProducts(5),
  ["admin-top-products"],
  { revalidate: 60, tags: ["admin-top-products"] }
);

export const GET = withLoggedAdminHandler(async () => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const topProducts = await getCachedTopProducts();
    return NextResponse.json(topProducts);
  } catch (error) {
    console.error("Admin top products error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
