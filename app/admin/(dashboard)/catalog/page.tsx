import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { hasPermission, Permission } from "@/lib/permissions";
import CatalogAssignmentClient from "./catalog-assignment-client";

export const dynamic = "force-dynamic";

export default async function CatalogAssignmentPage() {
  if (!FEATURE_FLAGS.CATALOG_ADMIN_ASSIGNMENTS_V1) {
    notFound();
  }

  const session = await auth();
  const role = session?.user?.role || "";
  const permissions = session?.user?.permissions;

  if (
    !session?.user ||
    !hasPermission(role, Permission.MANAGE_PRODUCTS, permissions)
  ) {
    notFound();
  }

  return (
    <CatalogAssignmentClient
      canManageCatalogPaths={hasPermission(
        role,
        Permission.MANAGE_SETTINGS,
        permissions
      )}
      canViewAuditLogs={hasPermission(
        role,
        Permission.VIEW_AUDIT_LOGS,
        permissions
      )}
    />
  );
}
