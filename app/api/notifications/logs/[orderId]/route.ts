import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/permissions"; // C9
import { getNotificationLogsByOrderId } from "@/lib/db-queries";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) { // FIXED: C9
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { orderId } = await params;
    const logs = await getNotificationLogsByOrderId(orderId);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Get notification logs error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}