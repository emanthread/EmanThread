import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessAdminApi } from "@/lib/admin-api-security";

type AdminRouteAccess =
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse };

export async function requireAdminApiAccess(request: Request): Promise<AdminRouteAccess> {
  const session = await auth();
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const url = new URL(request.url);
  const allowed = canAccessAdminApi(
    url.pathname,
    request.method,
    session.user.role || "",
    session.user.permissions
  );

  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, session };
}
