// ── Role-based permission system ─────────────────────────────────
//
// Maps roles to their default permissions. SUPER_ADMIN has all permissions.
// The `permissions` field on User can hold JSON overrides for custom access.

export const Permission = {
  VIEW_ORDERS: "VIEW_ORDERS",
  MANAGE_ORDERS: "MANAGE_ORDERS",
  VIEW_PRODUCTS: "VIEW_PRODUCTS",
  MANAGE_PRODUCTS: "MANAGE_PRODUCTS",
  VIEW_CUSTOMERS: "VIEW_CUSTOMERS",
  MANAGE_CUSTOMERS: "MANAGE_CUSTOMERS",
  VIEW_ANALYTICS: "VIEW_ANALYTICS",
  MANAGE_DISCOUNTS: "MANAGE_DISCOUNTS",
  MANAGE_RETURNS: "MANAGE_RETURNS",
  MANAGE_SETTINGS: "MANAGE_SETTINGS",
  MANAGE_SHIPPING: "MANAGE_SHIPPING",
  MANAGE_NEWSLETTER: "MANAGE_NEWSLETTER",
  VIEW_AUDIT_LOGS: "VIEW_AUDIT_LOGS",
  MANAGE_USERS: "MANAGE_USERS",
} as const;

export type PermissionValue = (typeof Permission)[keyof typeof Permission];

export const Role = {
  CUSTOMER: "CUSTOMER",
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  SUPPORT: "SUPPORT",
} as const;

export type RoleValue = (typeof Role)[keyof typeof Role];

// Role → default permissions mapping
export const ROLE_PERMISSIONS: Record<RoleValue, PermissionValue[]> = {
  CUSTOMER: [],
  SUPER_ADMIN: Object.values(Permission),
  ADMIN: [
    Permission.VIEW_ORDERS,
    Permission.MANAGE_ORDERS,
    Permission.VIEW_PRODUCTS,
    Permission.MANAGE_PRODUCTS,
    Permission.VIEW_CUSTOMERS,
    Permission.MANAGE_CUSTOMERS,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_DISCOUNTS,
    Permission.MANAGE_RETURNS,
    Permission.MANAGE_SETTINGS,
    Permission.MANAGE_SHIPPING,
    Permission.MANAGE_NEWSLETTER,
    Permission.VIEW_AUDIT_LOGS,
    Permission.MANAGE_USERS,
  ],
  MANAGER: [
    Permission.VIEW_ORDERS,
    Permission.MANAGE_ORDERS,
    Permission.VIEW_PRODUCTS,
    Permission.MANAGE_PRODUCTS,
    Permission.VIEW_CUSTOMERS,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_DISCOUNTS,
    Permission.MANAGE_RETURNS,
    Permission.MANAGE_SHIPPING,
  ],
  SUPPORT: [
    Permission.VIEW_ORDERS,
    Permission.VIEW_PRODUCTS,
    Permission.VIEW_CUSTOMERS,
    Permission.MANAGE_RETURNS,
  ],
};

/**
 * Resolve effective permissions for a user, combining role defaults
 * with any custom overrides stored in `user.permissions`.
 */
export function resolvePermissions(
  role: string,
  customPermissions?: string[] | string | null
): PermissionValue[] {
  const upperRole = role.toUpperCase() as RoleValue;
  const base = [...(ROLE_PERMISSIONS[upperRole] || [])];

  if (customPermissions && customPermissions !== "[]") {
    try {
      const custom: string[] = Array.isArray(customPermissions) ? customPermissions : JSON.parse(customPermissions);
      if (custom.length > 0) {
        return custom.filter((p): p is PermissionValue =>
          Object.values(Permission).includes(p as PermissionValue)
        );
      }
    } catch {
      // Ignore invalid JSON
    }
  }

  return base;
}

/**
 * Check if a role/permission set has a specific permission.
 * SUPER_ADMIN always passes.
 */
export function hasPermission(
  role: string,
  required: PermissionValue,
  customPermissions?: string[] | string | null
): boolean {
  const upperRole = role.toUpperCase();
  if (upperRole === Role.SUPER_ADMIN) return true;
  const perms = resolvePermissions(upperRole, customPermissions);
  return perms.includes(required);
}

/**
 * Check if a role/permission set has ANY of the required permissions.
 */
export function hasAnyPermission(
  role: string,
  required: PermissionValue[],
  customPermissions?: string[] | string | null
): boolean {
  const upperRole = role.toUpperCase();
  if (upperRole === Role.SUPER_ADMIN) return true;
  const perms = resolvePermissions(upperRole, customPermissions);
  return required.some((p) => perms.includes(p));
}

/**
 * Check if a role/permission set has ALL of the required permissions.
 */
export function hasAllPermissions(
  role: string,
  required: PermissionValue[],
  customPermissions?: string[] | string | null
): boolean {
  const upperRole = role.toUpperCase();
  if (upperRole === Role.SUPER_ADMIN) return true;
  const perms = resolvePermissions(upperRole, customPermissions);
  return required.every((p) => perms.includes(p));
}

/**
 * Backward-compatible admin check.
 * Treats ADMIN and SUPER_ADMIN as full admins.
 */
export function isAdminRole(role: string): boolean {
  const upperRole = role.toUpperCase();
  return upperRole === Role.ADMIN || upperRole === Role.SUPER_ADMIN;
}

/**
 * General staff check — anyone with a non-customer role.
 */
export function isStaffRole(role: string): boolean {
  const upperRole = role.toUpperCase();
  return upperRole !== Role.CUSTOMER;
}
