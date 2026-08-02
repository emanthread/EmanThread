import { parseJsonArray } from "@/lib/utils/parse-images";

/**
 * A private marker retained inside the existing JSON `tags` column. It gives
 * products a reversible archive state without deleting a live record or
 * requiring an immediate production schema change.
 */
export const ARCHIVED_PRODUCT_TAG = "__eman_thread_archived__";

export function archiveProductTags(rawTags: string | null | undefined): string {
  const tags = parseJsonArray(rawTags).filter(
    (tag) => tag !== ARCHIVED_PRODUCT_TAG,
  );
  return JSON.stringify([...tags, ARCHIVED_PRODUCT_TAG]);
}

/** Never expose the internal archive marker to storefront or admin tag UI. */
export function visibleProductTags(rawTags: string | null | undefined): string[] {
  return parseJsonArray(rawTags).filter(
    (tag) => tag !== ARCHIVED_PRODUCT_TAG,
  );
}
