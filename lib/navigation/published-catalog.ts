export function normalizePublishedCatalogPath(path: string): string {
  const normalized = path.trim().toLowerCase().replace(/\/+$/, "");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function publishedCatalogPathSet(paths: readonly string[]): Set<string> {
  return new Set(paths.map(normalizePublishedCatalogPath));
}

export function isPublishedCatalogHref(
  href: string | null | undefined,
  publishedPaths: ReadonlySet<string>
): boolean {
  return Boolean(
    href && publishedPaths.has(normalizePublishedCatalogPath(href))
  );
}
