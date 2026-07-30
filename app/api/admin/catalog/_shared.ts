import { NextResponse } from "next/server";
import { z } from "zod";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { requireAdminApiAccess } from "@/lib/admin-route-guard";
import { sanitizeDbError } from "@/lib/utils/errors";

export const catalogRecordIdSchema = z
  .string()
  .trim()
  .min(1, "ID is required")
  .max(128, "ID is too long");

export async function requireCatalogAdminApi(request: Request) {
  if (!FEATURE_FLAGS.CATALOG_ADMIN_ASSIGNMENTS_V1) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  return requireAdminApiAccess(request);
}

export function catalogApiError(error: unknown, context: string) {
  console.error(`[catalog-admin] ${context}:`, error);
  const { message, status } = sanitizeDbError(error);
  return NextResponse.json({ error: message }, { status });
}

