import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOrdersByUser } from "@/lib/db-queries";
import { sanitizeDbError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await getOrdersByUser(session.user.id);
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Fetch user orders error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
}