import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getReturnRequestsByUser } from "@/lib/db-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requests = await getReturnRequestsByUser(session.user.id);
    return NextResponse.json(requests);
  } catch (error) {
    console.error("Get user return requests error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}