export const DEFAULT_CATALOG_PATH = "/women";

export const CATALOG_ROOT_PATHS = [
  "/women",
  "/men",
  "/fragrance-beauty",
  "/teens",
] as const;

export type CatalogDepartment =
  (typeof CATALOG_ROOT_PATHS)[number] extends `/${infer Department}`
    ? Department
    : never;

/**
 * Resolve only department roots, never their descendants. CatalogNode paths
 * are persisted with a leading slash, while route-level department values do
 * not have one. Keeping that conversion here prevents the two representations
 * from drifting apart in hero/header checks.
 */
export function catalogDepartmentFromRootPath(
  pathname: string | null | undefined
): CatalogDepartment | null {
  const trimmedPath = pathname?.trim();
  if (!trimmedPath) return null;

  const pathWithLeadingSlash = trimmedPath.startsWith("/")
    ? trimmedPath
    : `/${trimmedPath}`;
  const normalizedPath =
    pathWithLeadingSlash.length > 1
      ? pathWithLeadingSlash.replace(/\/+$/, "")
      : pathWithLeadingSlash;
  const rootPath = CATALOG_ROOT_PATHS.find(
    (candidate) => candidate === normalizedPath
  );

  return rootPath ? (rootPath.slice(1) as CatalogDepartment) : null;
}

const NAVIGATION_FREE_ROUTE_PREFIXES = [
  "/account",
  "/checkout",
  "/measurements",
  "/settings",
  "/stitching",
] as const;

function isPathOrDescendant(pathname: string, root: string): boolean {
  return pathname === root || pathname.startsWith(`${root}/`);
}

export function shouldShowCatalogNavigation(pathname: string): boolean {
  return !NAVIGATION_FREE_ROUTE_PREFIXES.some((route) =>
    isPathOrDescendant(pathname, route)
  );
}

export function catalogSearchPath(pathname: string): string {
  return (
    CATALOG_ROOT_PATHS.find((root) => isPathOrDescendant(pathname, root)) ||
    DEFAULT_CATALOG_PATH
  );
}

export function catalogSearchHref(pathname: string, query: string): string {
  const search = query.trim();
  const path = catalogSearchPath(pathname);
  return search ? `${path}?q=${encodeURIComponent(search)}` : path;
}
