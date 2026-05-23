import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/permissions"; // C9
import { getReturnRequestById } from "@/lib/db-queries";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const request = await getReturnRequestById(id);

    if (!request) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify ownership
    if (request.customerId !== session.user.id && !isAdminRole(session.user.role)) { // FIXED: C9
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(request);
  } catch (error) {
    console.error("Get return request error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}