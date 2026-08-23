const DEFAULT_ADMIN_LIMIT = 50;
const MAX_ADMIN_LIMIT = 100;
const MAX_ADMIN_SEARCH_LENGTH = 160;

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function adminPageParam(value: string | null): number {
  return parsePositiveInt(value, 1);
}

export function adminLimitParam(
  value: string | null,
  fallback = DEFAULT_ADMIN_LIMIT,
  max = MAX_ADMIN_LIMIT
): number {
  return Math.min(max, parsePositiveInt(value, fallback));
}

/** Keep free-text admin filters predictable and safe for database queries. */
export function adminSearchParam(value: string | null): string | undefined {
  const search = value?.trim();
  if (!search) return undefined;
  return search.slice(0, MAX_ADMIN_SEARCH_LENGTH);
}
