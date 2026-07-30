# Eman Thread Approved Header and Additive Catalog Implementation Plan

Date: 2026-07-30  
Approved visual reference: `docs/emanthread-reference-header-demo.html`  
Status: implementation plan only — production code and database unchanged

## 1. Approved result

The existing storefront header will be replaced visually with the approved
two-row design:

### First row

- `WOMEN`, `MEN`, `FRAGRANCE & BEAUTY`, and `TEENS` on the left.
- A centered `E.` Eman Thread home link.
- Search, Wishlist, Account, and Bag on the right.
- White background, black text, thin grey borders, compact uppercase type.

### Second row

- Pakistan store indicator on the left.
- The selected department's subcategories centered horizontally.
- The active/hovered item receives the simple black underline used in the
  approved demo.

### Mega panel

- Clicking a main department selects it and changes the second row.
- Clicking a main department does **not** immediately open the large panel.
- Hovering, focusing, or clicking a second-row subcategory opens the panel.
- The panel contains the supplied grouped links on the left and three visual
  category cards on the right.
- Escape, outside click, and a close button close the panel.

### Mobile

- The same hierarchy becomes a hamburger drawer.
- Departments and subcategories use nested tap-driven accordions.
- All links, account utilities, and Stitching remain reachable without hover.

## 2. Scope of this implementation

This project adds two independent layers on top of the current live store:

1. the approved J.-style storefront header and mega-menu navigation;
2. dedicated SEO-friendly catalog pages backed by a new additive catalog
   taxonomy.

The new catalog includes:

- dedicated routes under `/women`, `/men`, `/fragrance-beauty`, and `/teens`;
- reusable catalog-page presentation and product-query code;
- additive `CatalogNode` and `ProductCatalogAssignment` tables;
- a separate admin Catalog Assignment screen;
- page-specific SEO metadata, breadcrumbs, banners, descriptions, featured
  content, grids, pagination, sorting, and filtering.

It does not redesign or replace:

- the homepage content sections;
- existing product cards or product-detail routes;
- `/shop`, its filters, sorting, search, or pagination;
- existing customer accounts;
- the existing admin Products screen or its Category/FabricType fields;
- cart, wishlist, checkout, orders, stock, or payments;
- existing Product, Category, or FabricType semantics.

The new header and the new catalog pages use separate feature flags. Either
layer can remain disabled while the production site continues using the current
header and legacy catalog.

The existing standalone HTML remains a design reference. It will not be
imported into Next.js or exposed as application logic.

## 3. What remains exactly as supplied

The complete approved hierarchy below will be stored in
`lib/navigation/catalog-menu.ts`. Labels, group boundaries, and leaf ordering
must remain exactly as supplied. No current database Category rows will be used
to generate this menu.

### WOMEN

#### NEW IN

`NEW IN` must support grouped leaf destinations, visual cards, ordering, and
future expansion. It must not be implemented as a single landing-page-only
item. The business-supplied leaf list will be inserted here and in
`catalog-menu.ts` without inventing, merging, or renaming destinations. Until
that list and its URLs are approved, the section remains configured but its
unapproved leaves remain hidden.

#### READY TO WEAR

- SHOP BY CATEGORY
  1. 3 PIECE
  2. SHIRT & DUPATTA
  3. KURTA
  4. MODEST WEAR
  5. BOTTOMWEAR
- SHOP BY COLLECTION
  1. SIGNATURE
  2. LUXE
  3. MATCHING SEPARATES

#### UNSTITCHED

- SHOP BY CATEGORY
  1. 3 PIECE
  2. 2 PIECE
  3. 1 PIECE
- SHOP BY COLLECTION
  1. NOYA
  2. ZARIYA
  3. LUXE

#### FORMALS

- SHOP BY CATEGORY
  1. RTW 2 PIECE
  2. RTW 3 PIECE
  3. UNSTITCHED
- SHOP BY COLLECTION
  1. FESTIVE '26

#### SALE

`SALE` remains a configured second-level section. No unapproved child
destinations will be invented.

### MEN

#### NEW IN

- SHOP BY CATEGORY
  1. KAMEEZ SHALWAR COLLECTION
  2. KURTA TROUSERS COLLECTION
  3. KURTA COLLECTION
  4. UNSTITCHED COLLECTION
  5. INNERWEAR

#### READY TO WEAR

- SHOP BY CATEGORY
  1. KAMEEZ SHALWAR
  2. KURTA
  3. KAMEEZ SHALWAR & WAISTCOAT
  4. KURTA TROUSERS
  5. WAISTCOAT
- SHOP BY COLLECTION
  1. HERITAGE EDIT
  2. EXCLUSIVE GIFT BOX

#### UNSTITCHED

- SHOP BY CATEGORY
  1. PLATINUM CLASS
  2. GOLD CLASS
  3. SILVER CLASS
  4. LATHA
  5. BOSKI
- FEATURED
  1. EXCLUSIVE GIFT BOX

#### CAST & CREW

- CLOTHING
  1. KAMEEZ SHALWAR
  2. KURTA TROUSERS
  3. WAISTCOAT
  4. JACKET
  5. UNSTITCHED
- ACCESSORIES
  1. PERFUME

#### SALE

`SALE` remains a configured second-level section. No unapproved child
destinations will be invented.

### FRAGRANCE & BEAUTY

#### NEW IN

Each item below is an individual leaf destination:

1. NEW ARRIVALS
2. ENIGMA NOIR
3. ZARAR METALLIC
4. ZARAR SHADOW
5. JANAN ZIRCON
6. JANAN PEARL
7. JANAN ONYX
8. WHISPER
9. TRISCENT POUR HOMME - GIFTSET
10. WASIM AKRAM 502 HIM & HER - GIFT SET
11. LUMIERE
12. FEATURED
13. GOURMET SERIES
14. JANAN FRAGRANCES
15. EXTRAIT SERIES - CAST & CREW
16. THE VALOR COLLECTION
17. WASIM AKRAM SERIES
18. AROMA OIL & DIFFUSERS
19. AIR FRESHENERS
20. BAKHOOR
21. GIFT SETS
22. MINIATURES
23. CONTINUOUS SPRAY PERFUMES

The implementation may arrange this long list into presentation columns, but
must not omit, merge, rename, or reorder any leaf.

#### FRAGRANCES

- MEN
  1. PERFUME
  2. MINIATURE
  3. ATTAR
  4. BEARD OIL
  5. GIFT SET
  6. BODY SPRAY
- WOMEN
  1. PERFUME
  2. MINIATURE
  3. BODY MIST
  4. GIFT SET
  5. BODY SPRAY
- OTHERS
  1. AROMA OIL & DIFFUSERS
  2. AIR FRESHENER
  3. BAKHOOR
  4. FRAGRANT SHOWER GEL
  5. REED DIFFUSER
  6. SCENTED CANDLE

#### MAKEUP

- FACE
  1. CREAM & FOUNDATION
  2. CONCEALER & CONTOUR
  3. FACE POWDER
  4. BLUSH & HIGHLIGHT
- EYES
  1. EYE LINER & MASCARA
  2. EYE SHADOW
  3. EYE PENCIL
  4. EYEBROW
- LIPS
  1. LIPSTICK
  2. LIP GLOSS
  3. LIP CARE
  4. LIP PENCIL
- ACCESSORIES
  1. BLENDER & SPONGE
  2. SHARPENER

#### SKINCARE

- COLLECTION
  1. SHOWER GEL
  2. CREAMS
  3. TONERS
- SHOP BY CATEGORY
  1. FACE
  2. BODY CARE
  3. HAIR
  4. HAND & FEET

### TEENS

#### NEW IN

- SHOP BY CATEGORY
  1. TEEN GIRLS
  2. TEEN BOYS
  3. KID GIRLS
  4. KID BOYS
  5. INFANT GIRLS
  6. INFANT BOYS

#### TEEN GIRLS

- SHOP BY COLLECTION
  1. SUMMER'26
- SHOP BY CATEGORY
  1. READY TO WEAR
  2. KURTI
  3. TROUSERS
  4. ESSENTIALS

#### TEEN BOYS

- SHOP BY COLLECTION
  1. SUMMER'26
- SHOP BY CATEGORY
  1. KAMEEZ SHALWAR
  2. KURTA
  3. SPECIAL KURTA
  4. JUBBA-THOBE
  5. BOTTOM WEAR

#### SALE

`SALE` remains a configured second-level section. No unapproved child
destinations will be invented.

Repeated labels such as `PERFUME`, `KURTA`, and `LUXE` remain separate
contextual nodes under their own department, section, and group.

## 4. Current code that will change

The current shared header is:

`components/layout/header.tsx`

Its existing relevant areas are:

- static navigation arrays: lines 37-52;
- logo placement: lines 123-131;
- desktop navigation: lines 134-204;
- search/wishlist/account/cart: lines 206-344;
- mobile menu: lines 352-468.

### New files

#### `lib/navigation/catalog-menu.ts`

Contains:

- the complete Department → Section → Group → Leaf hierarchy in this plan;
- stable contextual IDs;
- every navigation label and group heading;
- explicit leaf metadata: `href`, `status`, `image`, `badge`, `comingSoon`, and
  `visibility`;
- configurable image cards at department and section level;
- explicit display order for departments, sections, groups, leaves, and cards;
- active, disabled, coming-soon, unmapped, and hidden states.

This is static application configuration. It has no Prisma import, API call, or
database access.

This file is the single source of truth for navigation content. Components only
render the configuration. They must never hardcode department, section, group,
leaf, image-card, badge, or navigation-link labels.

#### `components/layout/catalog-header-menu.tsx`

Contains the desktop interaction:

- selected department;
- selected/hovered subcategory;
- open/closed mega panel;
- keyboard navigation;
- outside-click handling;
- Escape handling;
- route-change cleanup.

#### `components/layout/catalog-mobile-menu.tsx`

Contains:

- hamburger drawer;
- nested department/subcategory accordions;
- scroll locking;
- focus trapping;
- Escape and overlay dismissal;
- mobile utility links.

#### `components/layout/catalog-header-menu.module.css`

Contains only the approved header/menu styles:

- two-row grid layout;
- centered mark;
- underlines;
- borders;
- mega-panel columns;
- visual-card dimensions;
- responsive breakpoints;
- reduced-motion rules.

Using a CSS module prevents the new design from changing unrelated pages or
global components.

#### `tests/navigation.spec.ts`

Contains focused navigation tests. It must run only with an isolated test
database/environment.

#### Dedicated catalog routes

Use four explicit optional catch-all routes with a shared renderer:

- `app/women/[[...catalogPath]]/page.tsx`;
- `app/men/[[...catalogPath]]/page.tsx`;
- `app/fragrance-beauty/[[...catalogPath]]/page.tsx`;
- `app/teens/[[...catalogPath]]/page.tsx`.

Explicit department roots prevent the new system from intercepting unrelated
existing top-level routes. Each route resolves a canonical `CatalogNode.path`
and passes it to the same catalog-page service and presentation components.

#### `lib/db/catalog.ts`

Contains new catalog-only queries:

- resolve an active node by canonical path;
- load its ancestors and breadcrumbs;
- load assigned existing Product rows;
- paginate and sort the assigned rows;
- apply catalog-scoped filters;
- load page metadata, banner, description, and featured content.

It must not alter or replace `lib/db/products.ts` or the current `/shop` query
contract.

#### `components/catalog/catalog-page.tsx`

Renders the shared catalog experience:

- breadcrumb trail;
- banner and description;
- featured content;
- product grid using existing Product records;
- pagination;
- sorting;
- catalog-scoped filtering;
- empty, loading, and disabled states.

#### Admin Catalog Assignment

New, separate files:

- `app/admin/(dashboard)/catalog/page.tsx`;
- `app/api/admin/catalog/nodes/route.ts`;
- `app/api/admin/catalog/nodes/[id]/route.ts`;
- `app/api/admin/catalog/assignments/route.ts`;
- `app/api/admin/catalog/assignments/[id]/route.ts`.

The screen allows an authorized administrator to assign one existing product
to multiple catalog nodes. It does not replace or embed itself into the current
admin Products listing.

### Existing files modified

#### `components/layout/header.tsx`

Changes:

- import the new menu components and configuration;
- replace the current desktop Home/Shop/New Arrivals/Stitching navigation;
- center the logo as `E.`;
- place the existing store actions on the right;
- render the new second row;
- replace the current flat mobile navigation with the accordion menu;
- retain the current cart, wishlist, search, authentication, logout, and admin
  logic;
- retain the Stitching notice banner;
- keep the old navigation available behind a feature flag during rollout.

#### `lib/feature-flags.ts`

Add:

```ts
CATALOG_HEADER_V1: false,
CATALOG_PAGES_V1: false,
CATALOG_ADMIN_ASSIGNMENTS_V1: false
```

- `CATALOG_HEADER_V1=false` renders the current header.
- `CATALOG_PAGES_V1=false` keeps the new dedicated pages unavailable and
  unlinked.
- `CATALOG_ADMIN_ASSIGNMENTS_V1=false` hides and disables the new assignment
  interface and endpoints.

Disabling all three flags restores the original navigation and legacy catalog
experience without a database restore or migration rollback. The additive
tables may remain present and inert.

#### `prisma/schema.prisma` and one additive migration

Add only the new `CatalogNode` and `ProductCatalogAssignment` models and their
indexes/foreign keys. The generated migration must create new tables and
indexes only. It must not drop, rename, rewrite, or change columns, constraints,
or data in any existing table.

#### `app/admin/(dashboard)/layout.tsx`

Add a feature-flagged `Catalog Assignment` navigation entry with an appropriate
existing admin permission. All existing admin navigation entries and product
management behaviour remain unchanged.

#### `app/page.tsx`

The approved header is solid and has two compact rows. The homepage currently
starts beneath a transparent fixed header. A small top-offset adjustment may
be required so the hero is not hidden by the new solid header.

This will be limited to layout spacing; homepage sections and data queries will
not change.

#### Other storefront pages

The current site already uses `pt-20`, `pt-28`, or `pt-32` on most page
containers. The production header rows will be compacted to approximately the
current fixed-header footprint so those pages should not need broad rewrites.

Every route using `Header` will still be checked at desktop and mobile sizes.
Only routes with confirmed overlap will receive a small spacing correction.
No speculative bulk edit will be made.

## 5. Legacy files, data, and systems that will not change

The project must not modify the behaviour or data of:

- existing `/shop` pages and existing category/listing pages;
- existing product URLs and slugs;
- existing filtering, sorting, search, and pagination;
- existing product APIs;
- existing `Product`, `Category`, and `FabricType` table columns or rows;
- Product IDs, SKUs, images, prices, or stock values;
- `prisma/seed.ts`;
- existing product/category admin APIs;
- the existing admin Products listing and Category/FabricType fields;
- `lib/db/products.ts`;
- `app/api/products/route.ts`;
- cart state;
- wishlist state;
- checkout;
- order creation;
- stock deduction;
- payments;
- orders or customer data.

The only database writes introduced by this project are:

1. creation of new catalog-specific tables and indexes; and
2. node metadata and product-to-node assignments inside those new tables.

There are no writes to existing Product, Category, FabricType, Inventory,
Order, Cart, Wishlist, or customer records.

## 6. Component/data structure

The menu will use contextual IDs because labels repeat under different
departments. The complete hierarchy and all navigation metadata live in one
strongly typed `catalog-menu.ts` file:

```ts
type MenuStatus = "active" | "disabled" | "coming-soon" | "unmapped";
type MenuVisibility = "visible" | "hidden";

type MenuVisualCard = {
  id: string;
  label: string;
  href: string | null;
  image: string | null;
  badge: string | null;
  comingSoon: boolean;
  visibility: MenuVisibility;
  status: MenuStatus;
  order: number;
};

type MenuLeaf = {
  id: string;
  label: string;
  href: string | null;
  image: string | null;
  badge: string | null;
  comingSoon: boolean;
  visibility: MenuVisibility;
  status: MenuStatus;
  order: number;
};

type MenuGroup = {
  id: string;
  label: string;
  items: MenuLeaf[];
  order: number;
};

type MenuSection = {
  id: string;
  label: string;
  href: string | null;
  groups: MenuGroup[];
  visualCards: MenuVisualCard[];
  order: number;
};

type MenuDepartment = {
  id: "women" | "men" | "fragrance-beauty" | "teens";
  label: string;
  sections: MenuSection[];
  visualCards: MenuVisualCard[];
  order: number;
};
```

Examples:

- `women.ready-to-wear.kurta`
- `men.ready-to-wear.kurta`
- `teens.teen-boys.kurta`

This prevents repeated labels from being treated as the same destination.
Every required property is written explicitly, including `null`, `false`, or
`hidden` values. Components do not derive URLs, status, images, badges,
coming-soon behaviour, visibility, or order from a label.

## 7. Exact interaction flow

```text
Click main department
        |
        v
Set active department and rebuild second row
        |
        v
Keep large mega panel closed
        |
        v
Hover / focus / click a subcategory
        |
        v
Render its supplied groups and three visual cards
        |
        v
Click an approved leaf destination
        |
        v
Navigate and close the panel
```

### State held in the header

- `activeDepartment`
- `activeSection`
- `isMegaPanelOpen`
- `isMobileDrawerOpen`

No menu state will be stored in the database, cart store, auth store, local
storage, or cookies.

### Desktop keyboard behaviour

- Tab reaches every main category, subcategory, and leaf link.
- Left/Right arrows move between departments.
- Down arrow moves from a department to its subcategory row.
- Hover and keyboard focus produce the same content.
- Escape closes the panel and restores focus to the active department.

### Mobile accessibility

- No hover-only behaviour.
- Closed drawer is `inert` and removed from the tab sequence.
- Focus is trapped while the drawer is open.
- Escape/overlay/close button dismiss it.
- Focus returns to the hamburger button.

## 8. Header layout and theme behaviour

### Light mode

Matches the approved demo:

- white background;
- black text;
- grey separators;
- simple black active underline;
- serif `E.` mark;
- no rounded dropdown card around the mega panel.

### Dark mode

The existing theme toggle will not be removed. Dark mode will use the same
layout with existing dark surface/text tokens so controls remain readable.

Light mode is the approved visual source. Dark mode is a compatibility
treatment, not a separate redesign.

### Scroll behaviour

The current transparent-to-solid header treatment will change:

- the approved two-row header will be solid from first paint;
- scroll may add a subtle shadow or compact spacing;
- categories, row order, and controls will not jump between positions.

This is necessary to match the approved reference.

### Header height

The HTML demo uses generous showcase dimensions. Production rows will preserve
the same proportions while being calibrated to the current fixed-header
footprint:

- compact first row;
- compact second row;
- full-width overlay mega panel.

This prevents widespread changes to page padding and avoids covering page
titles.

## 9. Existing functionality placement

### Home

The centered `E.` remains a normal link to `/`.

### Search

The current search modal and Ctrl/Cmd+K shortcut remain unchanged.

### Wishlist

The existing wishlist page, count, and store remain unchanged.

### Account

The existing login/account/admin/logout dropdown remains. Only its trigger
position changes.

### Cart

The current cart button, count, screen-reader announcement, and drawer remain
unchanged.

### Stitching

The `/account/measurements` functionality is not removed.

To keep the desktop header identical to the approved design:

- Stitching moves into the Account utility dropdown;
- Stitching also appears in the mobile drawer's utility section.

This preserves access without adding a fifth main department.

### Current Shop link

The generic `/shop` destination remains available as a `Shop All` utility link
inside the Account/utility menu and mobile drawer.

## 10. Visual cards

The approved panel shows up to three image cards.

For the first implementation:

- image cards are configurable per department and per section in
  `catalog-menu.ts`;
- examples include Women → Ready To Wear, Women → Unstitched, and
  Men → Ready To Wear;
- each card explicitly defines its image, label, destination, badge,
  coming-soon state, visibility, status, and order;
- section-level cards take priority when a section is active;
- department-level cards provide a configured fallback when that section has
  no cards;
- components only render the resolved configuration and contain no hardcoded
  image paths, captions, or card destinations;
- they do not come from Product queries;
- missing images use an existing local fallback;
- images use fixed aspect ratios and `object-fit: cover`;
- no image upload or database migration is required.

The current demo's local fabric images can be used as temporary placeholders.
Department- or section-specific artwork can be replaced later by changing
configuration only.

## 11. Dedicated catalog pages and product mapping

### Architecture

The new navigation must not send customer-facing categories to inferred
`/shop?category=` filters. Every customer-facing department, category, and
meaningful subcategory receives an explicit, SEO-friendly dedicated route.

Approved route patterns include:

```text
/women
/women/new-in
/women/ready-to-wear
/women/ready-to-wear/3-piece
/women/ready-to-wear/kurta
/women/unstitched
/women/unstitched/3-piece

/men
/men/ready-to-wear
/men/unstitched/boski

/fragrance-beauty
/fragrance-beauty/fragrances/men/perfume
/fragrance-beauty/makeup/face
/fragrance-beauty/skincare/body-care

/teens
/teens/teen-girls
/teens/teen-girls/ready-to-wear
```

Every customer-visible node has one canonical path stored in the catalog
taxonomy. The path is approved configuration/data, not generated inside a
component from the display label. Unknown, hidden, disabled, or inactive paths
must return the appropriate controlled not-found/disabled response and must not
fall through to `/shop`.

### Same Product source, no duplication

Every catalog page reads from the existing `Product` table through additive
assignments. The page returns the same Product IDs and records used by the
current storefront.

The implementation must never:

- copy a Product row;
- create a second SKU;
- copy or maintain separate inventory;
- change a Product ID, slug, `categoryId`, or `fabricType`;
- change product-detail URLs;
- change cart, wishlist, checkout, order, or stock behaviour.

Product cards on a dedicated page link to the existing product-detail URL.
Adding or removing a catalog assignment changes only where that existing
product is discoverable in the new catalog.

### Additive catalog schema

Introduce two new tables:

#### `CatalogNode`

Stores the customer-facing catalog hierarchy and page content:

- stable ID;
- parent node ID;
- node type;
- label;
- slug;
- globally unique canonical path;
- description;
- banner image and accessible alternative text;
- featured content;
- SEO title and description;
- optional canonical override;
- index/noindex publication state;
- display order;
- active/visible state;
- created/updated timestamps.

Parent/child relationships represent Department → Section → Group/Category →
Leaf without changing the existing Category table.

#### `ProductCatalogAssignment`

Maps existing products to any number of catalog nodes:

- stable ID;
- existing `productId`;
- new `catalogNodeId`;
- optional featured state;
- optional catalog-specific display order;
- created/updated timestamps;
- unique constraint on `(productId, catalogNodeId)`;
- indexes on `productId`, `catalogNodeId`, and catalog ordering fields.

The mapping table references the existing Product primary key but adds no
column to the Product database table. Deleting an assignment never deletes a
product. Foreign-key delete behaviour must preserve existing product
management; if an existing product is deleted through the already-approved
legacy workflow, only its catalog assignments may be removed.

A single product can therefore appear in multiple nodes such as `New In`,
`Boski`, `Men`, and `Featured` without duplicating or editing the Product row.

### Dedicated catalog query path

`lib/db/catalog.ts` is independent of the legacy product-listing functions. It
will:

1. resolve the requested canonical catalog path;
2. select product IDs assigned to that node;
3. read those products from the existing Product table;
4. apply catalog-local pagination, sorting, and filtering;
5. return the page content and SEO metadata.

The query must be bounded, indexed, and paginated. It may reuse stable
presentation utilities or Product types, but it must not refactor or change the
legacy `/shop` data path as part of this project.

### SEO and page features

Every dedicated catalog page supports:

- unique metadata title and description;
- one canonical URL;
- index/noindex control based on publication status;
- hierarchical breadcrumbs and BreadcrumbList structured data;
- banner image and accessible alternative text;
- introductory description;
- optional featured content;
- product grid backed by existing Product records;
- paginated URLs;
- sorting and filtering;
- valid empty states;
- stable internal links from the approved navigation.

Canonical tags must point to the dedicated catalog route, not an inferred
`/shop?category=` URL. Filter/sort/pagination canonical and indexing policy must
be documented and tested before indexing is enabled.

### Navigation configuration contract

Every leaf in `catalog-menu.ts` still explicitly defines:

- `href`: its approved dedicated catalog route or `null`;
- `status`: `active`, `disabled`, `coming-soon`, or `unmapped`;
- `image`: configured image path or `null`;
- `badge`: configured badge text or `null`;
- `comingSoon`: explicit boolean;
- `visibility`: `visible` or `hidden`;
- `order`: explicit position within its group.

No component may slugify a label, infer a URL, construct a `/shop?category=`
query, or reuse another node's URL implicitly. The configured `href` and the
corresponding active `CatalogNode.path` must match exactly; a validation test
enforces that invariant.

### Permanent backward compatibility

The following remain unchanged and permanently available:

- `/shop`;
- existing category and product-listing URLs;
- existing product URLs and slugs;
- existing internal links, search-result links, bookmarks, and inbound links;
- existing filters, sorting, search, and pagination;
- existing customer-facing and admin APIs;
- existing Product, Category, and FabricType logic;
- existing admin product management;
- cart, wishlist, checkout, inventory, and orders.

No existing URL is redirected to a new catalog page during this project.
Redirects require a separate, explicit future approval. Both catalog systems
operate simultaneously after launch.

### Catalog-page go-live rule

A dedicated page may become visible and indexable only when:

1. its canonical path is approved;
2. its `CatalogNode` exists and is active;
3. its visible navigation link matches that path;
4. its SEO metadata, breadcrumb, description, and banner state are approved;
5. its product assignments are reviewed;
6. pagination, sorting, filtering, empty states, and performance pass;
7. legacy-route regression tests remain unchanged.

No guessed mapping or empty customer-facing destination will be published.

## 12. Admin catalog assignment and gradual population

### Separate admin workflow

Add a new `Catalog Assignment` screen to the existing admin panel. It is
separate from the current Products screen and protected by the existing admin
guard plus an approved product-management permission.

Administrators can:

- search and select an existing product;
- view its Product ID, SKU, name, and current legacy Category/FabricType as
  read-only context;
- assign it to multiple active catalog nodes;
- remove individual assignments without deleting or editing the product;
- mark an assignment featured;
- set optional per-node ordering;
- filter products by assigned/unassigned node;
- perform a reviewed bulk assignment by explicit Product IDs/SKUs;
- see validation errors and an audit trail.

The Catalog Assignment UI must never replace or write the existing Category or
FabricType controls.

### Gradual population

“Migration” in this project means gradual addition of mapping rows, not movement
or conversion of existing product data:

1. create the additive tables with all catalog flags disabled;
2. load the approved catalog-node hierarchy into `CatalogNode` through a
   reviewed, idempotent catalog bootstrap that writes only the new table;
3. assign a small reviewed product set in a non-production clone;
4. verify dedicated pages privately;
5. enable the admin assignment feature for authorized production staff;
6. populate assignments incrementally;
7. publish catalog pages individually only when each page passes its go-live
   rule;
8. enable the new header only after every visible link is approved.

Products without any catalog assignment remain fully available through all
legacy listing, search, product-detail, cart, and checkout flows.

### API isolation

New admin endpoints operate only on `CatalogNode` and
`ProductCatalogAssignment`. They must:

- use the current admin route guard and CSRF/security conventions;
- validate IDs, node status, limits, and uniqueness;
- reject unknown Product IDs without editing Product;
- use transactions only around new-table writes;
- record assignment changes through the existing audit mechanism where
  compatible;
- never call legacy product update/delete functions.

## 13. Source and database safety

### Production-critical baseline

The Hostinger deployment contains live products, customers, orders, indexed
URLs, and active traffic. The current listing system is production-critical and
remains the primary legacy catalog until the additive system is implemented,
tested, explicitly approved, and selectively enabled.

Before implementation:

1. record the current commit (`d997634` at plan creation);
2. preserve the existing untracked documentation;
3. create a dedicated feature branch;
4. inventory all current public listing, product, API, sitemap, canonical, and
   admin-product URLs;
5. record baseline response status, canonical metadata, product counts, Product
   IDs/SKUs, stock totals, and representative filter results;
6. confirm no unrelated tracked Product/Category/schema changes are mixed into
   the work.

### Mandatory backup before the additive migration

Before running any new catalog migration against production:

1. create a Hostinger/provider-managed database snapshot;
2. create a verified custom-format PostgreSQL dump outside the repository;
3. restore that dump into a disposable database;
4. run the migration against the disposable restore first;
5. compare Product, Category, SKU, stock, `categoryId`, `fabricType`, Order, and
   customer-data invariants before and after;
6. document and test the restore procedure and responsible operator;
7. retain the verified backup according to the approved production policy.

Do not run the current `db:migrate-safe` script automatically for this work.
First inspect the repository script and the generated SQL against the current
production schema.

### Additive-migration acceptance rule

The generated SQL must be reviewed before execution. It may:

- create `CatalogNode`;
- create `ProductCatalogAssignment`;
- create indexes and new-table constraints;
- create foreign keys from the new tables to the existing Product table.

It must not:

- `DROP`, rename, truncate, or rewrite an existing table;
- alter an existing Product, Category, FabricType, Inventory, Order, or
  customer column;
- update or delete an existing row;
- regenerate Product IDs or SKUs;
- seed or overwrite Product, Category, or FabricType data.

Production migration occurs during an approved low-traffic window with all
catalog flags disabled. The migration is considered successful only when
legacy smoke tests and data invariants match the recorded baseline.

### Runtime isolation

- Legacy `/shop` requests never depend on `CatalogNode` or assignments.
- Existing APIs never require the new tables.
- New catalog query failures do not fall back to, mutate, or change legacy
  listing results.
- Assignment writes are restricted to the new mapping tables.
- All new endpoints have bounded queries, validation, authorization, CSRF
  protection, rate/size limits, and audit logging.
- Disabling the flags leaves the new tables inert and restores the original
  customer experience without a data restore.

## 14. Implementation sequence

### Phase 0 — baseline and isolated environment

- create the feature branch;
- capture legacy URL, database, SEO, and product-listing baselines;
- restore a production backup into a disposable database;
- configure preview/staging with all catalog flags off.

Production impact: none.

### Commit 1 — navigation configuration only

- add `catalog-menu.ts`;
- copy the approved hierarchy;
- add stable IDs;
- add explicit dedicated-route metadata;
- mark destinations as verified, disabled, hidden, coming soon, or unmapped;
- add a configuration validation test.

Database impact: none.

### Commit 2 — additive schema and migration

- add `CatalogNode` and `ProductCatalogAssignment`;
- add unique constraints, indexes, and safe foreign keys;
- generate and manually inspect additive SQL;
- prove the migration on the disposable database;
- verify legacy table schemas and data invariants are unchanged.

Database impact: new tables/indexes only; no existing-row writes.

### Commit 3 — catalog data and route resolver

- add the catalog-only data layer;
- resolve canonical paths;
- query assigned existing Product rows;
- add pagination, sorting, and filtering;
- add not-found, hidden, disabled, and empty states;
- keep all legacy queries untouched.

Database impact: read-only.

### Commit 4 — dedicated catalog pages and SEO

- add explicit `/women`, `/men`, `/fragrance-beauty`, and `/teens` route roots;
- build the shared catalog-page renderer;
- add metadata, canonical URLs, breadcrumbs, structured data, banners,
  descriptions, featured content, grid, filters, sorting, and pagination;
- gate routes with `CATALOG_PAGES_V1`.

Database impact: read-only.

### Commit 5 — separate admin Catalog Assignment

- add the separate admin screen and guarded APIs;
- add multi-node assignment and removal;
- add featured/order controls and reviewed bulk assignment;
- add audit events;
- gate UI and endpoints with `CATALOG_ADMIN_ASSIGNMENTS_V1`;
- leave the current Products page and APIs unchanged.

Database impact: writes only to new catalog tables.

### Commit 6 — approved desktop and mobile header

- build the two desktop rows and mega panel;
- build the mobile drawer/accordion hierarchy;
- preserve search, account, cart, wishlist, Stitching, and Shop All;
- connect only approved dedicated catalog paths;
- keep the existing header as the `CATALOG_HEADER_V1=false` fallback.

Database impact: none.

### Commit 7 — tests, accessibility, SEO, and performance

- validate config paths against active catalog nodes;
- test navigation and catalog pages at supported viewports;
- test keyboard/focus behaviour;
- compare every legacy regression baseline;
- test SEO/canonical/indexing rules;
- load-test representative high-assignment catalog nodes;
- verify flags and immediate rollback.

Database impact: test-clone assignments only until production approval.

## 15. Verification plan

### Static/code checks

- TypeScript compilation;
- hierarchy IDs unique;
- all supplied labels represented;
- all configured visible links have an approved state;
- no Prisma/database imports in navigation files;
- no external image dependency unless explicitly approved;
- every visible config `href` matches an active canonical catalog path;
- migration SQL contains additive operations only;
- no legacy route, API contract, or Product query file is changed
  unintentionally.

### Catalog functional checks

- department, section, group, and meaningful leaf routes resolve correctly;
- each page returns only products assigned to that node;
- the returned Product IDs exist in the original Product table;
- one Product can appear in multiple nodes without duplication;
- no assignment changes SKU, stock, price, slug, Category, or FabricType;
- pagination has stable boundaries and no duplicate/missing Product IDs;
- sorting and filters remain scoped to the selected catalog node;
- unassigned products remain available through the legacy store;
- inactive/hidden nodes are not linked or indexed;
- unknown paths return a controlled 404;
- product cards retain existing product-detail URLs.

### Admin checks

- only authorized admins can view or change assignments;
- one product can be assigned to multiple nodes;
- duplicate `(productId, catalogNodeId)` mappings are rejected;
- removing an assignment does not delete or edit Product;
- Category and FabricType remain read-only context in the new screen;
- the existing Products screen and APIs produce the baseline behaviour;
- bulk actions are bounded, validated, reviewed, and audited.

### SEO checks

- unique title and description per published page;
- one correct canonical per page;
- BreadcrumbList structured data matches the visible hierarchy;
- banner alt text and headings are accessible;
- filter/sort/pagination index policy is consistent;
- disabled, empty-unapproved, and preview pages are noindex;
- sitemap inclusion occurs only after page approval;
- no existing indexed URL changes canonical or begins redirecting.

### Performance checks

- indexed node and assignment lookups;
- bounded page size;
- no N+1 Product or ancestor queries;
- representative page response and database timings meet the approved budget;
- cache/revalidation does not expose unpublished node changes;
- new queries do not measurably degrade `/shop`, search, checkout, or admin.

### Desktop sizes

- 1440px;
- 1280px;
- 1024px.

Verify:

- logo remains centered independently of left/right widths;
- no department overlap;
- subcategory row scrolls safely when required;
- mega panel stays below the actual header;
- long Fragrance content scrolls internally;
- image cards remain aligned;
- outside click and Escape close correctly.

### Mobile/tablet sizes

- 768px;
- 430px;
- 375px;
- 320px.

Verify:

- drawer replaces desktop navigation;
- nested accordions contain the complete hierarchy;
- body scroll restores after closing/resizing;
- focus cannot move behind the open drawer;
- links are usable without hover.

### Regression checks

- home logo still navigates home;
- search modal opens;
- wishlist count remains correct;
- login/account/admin dropdown remains correct;
- logout remains correct;
- cart count and cart drawer remain correct;
- Stitching remains reachable;
- Shop All remains reachable;
- current product-listing filters return the same products;
- existing `/shop`, category, product, API, search, pagination, and bookmarked
  URLs return their baseline status and results;
- admin Products listing, create, update, and approved delete behaviour remain
  unchanged;
- no Product, Category, FabricType, SKU, stock, cart, order, or customer record
  changes;
- legacy listing remains available even after all new catalog flags are
  enabled.

### Test-environment rule

Do not run full Playwright, auth, checkout, seed, destructive admin, or migration
verification against the currently configured production database.

Use the verified disposable database clone for migration and application-level
verification. Production receives only the reviewed additive migration and
explicitly approved catalog assignments.

## 16. Rollout

### Preview and staging

1. Deploy with all three catalog flags disabled.
2. Confirm the current header, `/shop`, product URLs, APIs, admin Products,
   search, cart, wishlist, and checkout match baseline.
3. Apply the additive migration to the verified disposable/staging clone.
4. Load approved nodes and sample assignments into the clone.
5. Enable only `CATALOG_ADMIN_ASSIGNMENTS_V1` for authorized preview users.
6. Enable `CATALOG_PAGES_V1` in preview and verify functional, SEO,
   accessibility, and performance requirements.
7. Enable `CATALOG_HEADER_V1` in preview last.
8. Review desktop, tablet, mobile, light, and dark modes plus every visible
   destination.

### Production

1. Take and verify the production snapshot and dump.
2. Deploy tested code with all catalog flags disabled.
3. Apply the reviewed additive migration in the approved window.
4. immediately compare legacy invariants and smoke-test current production
   flows.
5. Enable the admin assignment feature only for authorized staff.
6. Populate and review assignments gradually.
7. Enable approved catalog pages individually while keeping them out of the
   main navigation until ready.
8. Enable the new header only after all visible routes pass.
9. Monitor errors, query latency, empty pages, indexing signals, conversion,
   checkout, and legacy listing health.

The legacy listing remains the default production experience throughout
development and only becomes one of two simultaneous catalog entry paths after
approval. It is never removed.

### Immediate rollback

1. Set `CATALOG_HEADER_V1`, `CATALOG_PAGES_V1`, and
   `CATALOG_ADMIN_ASSIGNMENTS_V1` to `false`.
2. Redeploy/reload configuration using the established production process.
3. Confirm the original header and legacy product listing match baseline.

No database restore or code rollback is required. The additive catalog tables
and assignments remain inert for diagnosis. A database restore is reserved
only for a separately assessed database incident, not normal feature rollback.

### Permanent legacy policy

Launching the new catalog does not authorize removal of `/shop` or any legacy
listing system. Removal, redirects, or data conversion would require a separate
future migration project with its own analysis, backups, testing, SEO plan,
approval, and rollback.

## 17. Expected final change summary

| Area | Change |
| --- | --- |
| Header layout | Replaced with the approved two-row design |
| Main navigation | Women, Men, Fragrance & Beauty, Teens |
| Logo | Centered `E.` home link |
| Secondary row | Dynamic subcategories for active department |
| Mega panel | Hover/focus/click grouped links plus three images |
| Mobile | Nested accordion drawer |
| Search/wishlist/account/cart | Preserved; position changes only |
| Stitching/Shop All | Preserved in utilities/mobile drawer |
| Theme | Approved light design plus compatible existing dark mode |
| Dedicated catalog | New SEO-friendly routes under four explicit roots |
| Product source | Existing Product rows only; no duplication |
| Catalog taxonomy | Two additive tables and isolated data layer |
| Admin | Separate multi-node Catalog Assignment screen |
| Existing `/shop` | Unchanged and permanently available |
| Existing Product/Category/FabricType | No column, row, semantic, or URL changes |
| Cart/checkout/orders/inventory | Unchanged |
| SEO | Per-page metadata, canonical, breadcrumbs, content, and grid |
| Rollback | Three feature flags; no normal database restore |

## 18. Decisions needed before enabling production

The architecture and legacy-preservation rules are settled. Before individual
pages or the header become public:

1. approve the canonical route or disabled/hidden state for every node;
2. supply the missing Women → New In leaf destinations;
3. approve each node's SEO title, description, banner, canonical, index state,
   and featured content;
4. approve the initial Product ID/SKU-to-node assignment set;
5. approve catalog filter and sort options plus pagination/indexing policy;
6. approve final image cards for Women, Men, Fragrance & Beauty, and Teens;
7. confirm that Stitching and Shop All should live in utilities/mobile as
   planned;
8. confirm whether dark mode remains compatible or the header always stays
   white;
9. select the existing admin permission allowed to manage catalog assignments;
10. approve the production migration window, backup owner, deployment owner,
    monitoring window, and rollback operator.

Implementation can begin behind disabled flags before content and assignments
are complete. No catalog page becomes linked or indexable until its individual
go-live rule passes.
