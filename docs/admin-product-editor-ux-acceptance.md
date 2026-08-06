# Admin product editor UX acceptance

Run this after the catalog migrations and manifest have been applied and both
admin catalog/commerce flags are enabled. Use a product-manager account, a
prepared product image, and a catalog containing at least 500 active nodes.

Do not coach the merchandiser during the timed tasks. Record hesitation,
backtracking, validation errors, and questions as failures even if the product
is eventually saved.

## Timed tasks

| Task | Pass condition |
| --- | --- |
| Create a fragrance | From the loaded Add Product page, select a perfume category, enter the required product data, attach the prepared image, and save in 30 seconds or less excluding upload transfer time; zero help or backtracking. |
| Create ready-to-wear | Category selection immediately reveals color, optional fabric, required sizes, size guide, and variant inventory. "Add common sizes" completes the size setup without manual repetition. |
| Switch Kurta to Perfume | Fabric, color, size guide, stitching, required sizes, and variant inventory disappear immediately. Their stale values are absent from the saved payload. |
| Compare form length | Fragrance and skincare show no apparel-only fields. Advanced catalog placements, product details, and SEO remain closed until deliberately opened. |

## Large catalog picker

1. Open Category with at least 500 catalog nodes loaded.
2. Confirm no more than 75 result rows are mounted at once.
3. Search by leaf label, parent label, and path fragment.
4. Select the result using only the keyboard.

Pass when the picker opens without perceptible lag, search feedback appears in
under 100 ms, the correct breadcrumb is selected, and no long unfiltered list
must be scanned.

## Safety checks

- Edit a field, then use sidebar navigation, browser Back, browser Forward,
  refresh, and logout. Every route must protect the unsaved draft.
- Confirm quick and bulk stock controls are absent for variant-inventory
  products.
- Archive the last product on a paginated/filter page. The list must recover to
  the last valid page instead of showing a stranded empty page.
- Open Catalog Assignment. The default queue must contain only products with a
  missing, invalid, or commerce-mismatched primary category.
- Change a category from apparel to fragrance and save once. Core product,
  primary category, commerce profile, and option retirement must commit or
  fail together.

## Result record

| Tester | Date | Fragrance time | RTW time | Picker result | Safety result | Verdict |
| --- | --- | ---: | ---: | --- | --- | --- |
|  |  |  |  |  |  |  |

Production acceptance requires every row above to pass with no unresolved
data-loss, classification, or inventory defect.
