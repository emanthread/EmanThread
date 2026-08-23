import { NextResponse } from "next/server";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from "@/lib/utils/errors";
import { getAdminOrders } from "@/lib/db/orders";
import { requireAdminApiAccess } from "@/lib/admin-route-guard";

export const dynamic = "force-dynamic";

export const GET = withLoggedAdminHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const access = await requireAdminApiAccess(req);
  if (!access.ok) return access.response;

  try {
    const { id } = await params;
    const result = await getAdminOrders({ search: id, page: 1, limit: 1 });
    const order = result.orders.find((candidate) => candidate.id === id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Get order details error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
