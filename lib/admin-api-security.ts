import {
  hasAnyPermission,
  Permission,
  Role,
  type PermissionValue,
} from "@/lib/permissions";

interface AdminApiPolicy {
  prefix: string;
  read: PermissionValue[];
  write?: PermissionValue[];
  adminOnly?: boolean;
}

const ADMIN_API_POLICIES: AdminApiPolicy[] = [
  { prefix: "/api/admin/account", read: [], adminOnly: true },
  { prefix: "/api/admin/api-keys", read: [], adminOnly: true },
  { prefix: "/api/admin/audit-logs", read: [Permission.VIEW_AUDIT_LOGS] },
  {
    prefix: "/api/admin/alerts",
    read: [
      Permission.VIEW_ANALYTICS,
      Permission.VIEW_ORDERS,
      Permission.VIEW_PRODUCTS,
      Permission.MANAGE_RETURNS,
    ],
  },
  { prefix: "/api/admin/analytics", read: [Permission.VIEW_ANALYTICS] },
  {
    prefix: "/api/admin/orders",
    read: [Permission.VIEW_ORDERS],
    write: [Permission.MANAGE_ORDERS],
  },
  {
    prefix: "/api/admin/payments",
    read: [Permission.VIEW_ORDERS],
    write: [Permission.MANAGE_ORDERS],
  },
  {
    prefix: "/api/admin/products",
    read: [Permission.VIEW_PRODUCTS],
    write: [Permission.MANAGE_PRODUCTS],
  },
  {
    prefix: "/api/admin/inventory",
    read: [Permission.VIEW_PRODUCTS],
    write: [Permission.MANAGE_PRODUCTS],
  },
  {
    prefix: "/api/admin/categories",
    read: [Permission.VIEW_PRODUCTS],
    write: [Permission.MANAGE_PRODUCTS],
  },
  {
    prefix: "/api/admin/fabric-types",
    read: [Permission.VIEW_PRODUCTS],
    write: [Permission.MANAGE_PRODUCTS],
  },
  {
    prefix: "/api/admin/featured-categories",
    read: [Permission.VIEW_PRODUCTS],
    write: [Permission.MANAGE_PRODUCTS],
  },
  {
    prefix: "/api/admin/hero-slides",
    read: [Permission.VIEW_PRODUCTS],
    write: [Permission.MANAGE_PRODUCTS],
  },
  {
    prefix: "/api/admin/media",
    read: [Permission.VIEW_PRODUCTS],
    write: [Permission.MANAGE_PRODUCTS],
  },
  {
    prefix: "/api/admin/upload",
    read: [Permission.VIEW_PRODUCTS],
    write: [Permission.MANAGE_PRODUCTS],
  },
  {
    prefix: "/api/admin/reviews",
    read: [Permission.VIEW_PRODUCTS],
    write: [Permission.MANAGE_PRODUCTS],
  },
  {
    prefix: "/api/admin/customers",
    read: [Permission.VIEW_CUSTOMERS],
    write: [Permission.MANAGE_CUSTOMERS],
  },
  {
    prefix: "/api/admin/customer-measurements",
    read: [Permission.VIEW_CUSTOMERS],
    write: [Permission.MANAGE_CUSTOMERS],
  },
  {
    prefix: "/api/admin/measurements",
    read: [Permission.VIEW_CUSTOMERS],
    write: [Permission.MANAGE_CUSTOMERS],
  },
  { prefix: "/api/admin/discounts", read: [Permission.MANAGE_DISCOUNTS] },
  { prefix: "/api/admin/returns", read: [Permission.MANAGE_RETURNS] },
  { prefix: "/api/admin/shipping", read: [Permission.MANAGE_SHIPPING] },
  { prefix: "/api/admin/newsletter", read: [Permission.MANAGE_NEWSLETTER] },
  { prefix: "/api/admin/settings", read: [Permission.MANAGE_SETTINGS] },
  { prefix: "/api/admin/content-pages", read: [Permission.MANAGE_SETTINGS] },
  { prefix: "/api/admin/stitching-prices", read: [Permission.MANAGE_SETTINGS] },
  { prefix: "/api/admin/stitching-calendar", read: [Permission.MANAGE_SETTINGS] },
];

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function canAccessAdminApi(
  pathname: string,
  method: string,
  role: string,
  customPermissions?: string[] | string | null
): boolean {
  if (role.toUpperCase() === Role.SUPER_ADMIN) return true;

  const policy = ADMIN_API_POLICIES.find(({ prefix }) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!policy || policy.adminOnly) return false;

  const required = READ_METHODS.has(method.toUpperCase())
    ? policy.read
    : policy.write || policy.read;
  return hasAnyPermission(role, required, customPermissions);
}

function forwardedValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

export function hasValidAdminCsrf(
  request: Request,
  cookieToken?: string
): boolean {
  if (READ_METHODS.has(request.method.toUpperCase())) return true;

  const headerToken = request.headers.get("x-csrf-token");
  if (headerToken) return Boolean(cookieToken && headerToken === cookieToken);
  if (!cookieToken) return false;

  const requestUrl = new URL(request.url);
  const protocol =
    forwardedValue(request.headers.get("x-forwarded-proto")) ||
    requestUrl.protocol.replace(":", "");
  const host =
    forwardedValue(request.headers.get("x-forwarded-host")) ||
    request.headers.get("host") ||
    requestUrl.host;
  const expectedOrigin = `${protocol}://${host}`;

  const origin = request.headers.get("origin");
  if (origin) return origin === expectedOrigin;

  const referer = request.headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).origin === expectedOrigin;
  } catch {
    return false;
  }
}
