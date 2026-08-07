# Header menu cards

Admins with product-management access can edit storefront mega-menu cards at
`/admin/header-cards`.

Editable presentation fields:

- image;
- title and optional subtitle;
- optional call to action;
- display order;
- visible/hidden state;
- destination selected from an existing catalog node.

Catalog IDs, slugs, paths, hierarchy, and parent-child relationships are not
editable on this page. The destination selector resolves a system-owned node
ID to its system-owned path when the storefront renders the card.

Each department has default cards. Sections with their own built-in cards use
those cards; other sections inherit their department defaults until an admin
customizes that section. **Use default cards** removes the section's
presentation override and restores inheritance.

The configuration is stored in the existing `StoreConfig` table under
`catalog_header_cards_v1`. No schema migration or product-data rewrite is
required. If the row is missing, malformed, or temporarily unavailable, the
storefront renders the original cards from `lib/navigation/catalog-menu.ts`.
