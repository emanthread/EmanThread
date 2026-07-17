import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAuditLogs, deleteAuditLog, clearAllAuditLogs, createAuditLog } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from '@/lib/utils/errors';
import { adminLimitParam, adminPageParam } from "@/lib/admin-pagination";

export const dynamic = "force-dynamic";

export const GET = withLoggedAdminHandler(async (req: Request) => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = adminPageParam(searchParams.get("page"));
    const limit = adminLimitParam(searchParams.get("limit"), 50);
    const action = searchParams.get("action") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const entity = searchParams.get("entity") || undefined;

    const result = await getAuditLogs({ page, limit, action, userId, entity });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Audit logs error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});

export const DELETE = withLoggedAdminHandler(async (req: Request) => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      await deleteAuditLog(id);
      void createAuditLog({
        userId: session.user.id,
        userEmail: session.user.email || undefined,
        action: "AUDIT_LOG_DELETED" as any,
        entity: "AuditLog",
        entityId: id,
      });
      return NextResponse.json({ success: true, message: "Log entry deleted" });
    }

    await clearAllAuditLogs();
    void createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      action: "AUDIT_LOGS_CLEARED" as any,
      entity: "AuditLog",
    });
    return NextResponse.json({ success: true, message: "All audit logs cleared" });
  } catch (error) {
    console.error("Delete audit logs error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
