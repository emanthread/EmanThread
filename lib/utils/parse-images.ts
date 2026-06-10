/**
 * Safely parse product images stored as a JSON string column.
 * Returns an empty array on any parse failure instead of crashing.
 */
export function parseProductImages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error('[parseProductImages] Invalid JSON:', raw);
    return [];
  }
}

/**
 * Safely parse a JSON string column that stores a string array.
 * Returns an empty array on parse failure.
 */
export function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error('[parseJsonArray] Invalid JSON:', raw);
    return [];
  }
}
