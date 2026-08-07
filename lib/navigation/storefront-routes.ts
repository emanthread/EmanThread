export const DEFAULT_CATALOG_PATH = "/women";

export const CATALOG_ROOT_PATHS = [
  "/women",
  "/men",
  "/fragrance-beauty",
  "/teens",
] as const;

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
