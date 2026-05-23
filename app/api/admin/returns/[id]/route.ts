import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/permissions";
import { updateReturnRequest, deleteReturnRequest, createAuditLog } from "@/lib/db-queries";
import { updateReturnRequestSchema } from "@/lib/validators/returns";
import { withLoggedAdminHandler } from "@/lib/logger";

export const dynamic = "force-dynamic";

export const PUT = withLoggedAdminHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const result = updateReturnRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const updated = await updateReturnRequest(id, result.data);

    void createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      action: "RETURN_REQUEST_UPDATED",
      entity: "ReturnRequest",
      entityId: id,
      newValue: result.data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update return request error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const DELETE = withLoggedAdminHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await deleteReturnRequest(id);

    void createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      action: "RETURN_REQUEST_DELETED",
      entity: "ReturnRequest",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete return request error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
