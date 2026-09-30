/** Existing products keep their assignments unless the category is edited. */
export function requiresCatalogSelection(
  isExistingProduct: boolean,
  categoryChanged: boolean,
): boolean {
  return !isExistingProduct || categoryChanged;
}
