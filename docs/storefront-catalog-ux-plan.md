# Storefront catalog UX plan

## Outcome

The dedicated department and subcategory pages are the only product-listing
experience. The retired `/shop` URL permanently redirects to `/women` for old
bookmarks, while all new customer links target canonical catalog routes.

## Scope and acceptance criteria

### Catalog filters

- Remove the duplicate **Department & Collection** selector from desktop and
  mobile filters. Department changes belong in the global catalog navigation.
- Replace minimum/maximum number inputs with a two-thumb range slider from
  PKR 0 to PKR 10,000 in PKR 500 steps.
- Give each slider thumb its own accessible name and formatted PKR value.
- Show the complete season set on Women, Men, and Teens clothing landings and
  descendants: Summer, Winter, Eid, Festive, All Season, Casual, Formal, and
  Wedding.
- Do not expose Season on Fragrance & Beauty or a typed non-clothing leaf such
  as a perfume page.
- Keep current query state when search, sort, or sidebar filters are submitted.

### Sidebar scrolling

- Keep the desktop sidebar sticky beneath the measured catalog header.
- Constrain it to the remaining viewport height and give it an independent
  `overflow-y: auto` scroll area.
- Add explicit, keyboard-operable scroll-up and scroll-down buttons.
- Keep the mobile filter sheet touch-scrollable.

### Results toolbar

- Put collection search, product-grid density, and sorting together above the
  product results.
- Keep Featured and Trending in the sorting control.
- Provide labelled, stateful buttons for compact and comfortable card grids.
- Preserve active filters when search or sort changes; reset pagination.

### Product media

- Listing cards show one stable primary image only.
- Remove previous/next arrows, swipe handling, and hover image replacement from
  listing cards.
- Preserve image selection in Quick View and the full product-detail gallery.

### Header route rules

- Hide department and subcategory navigation on `/account` and all descendants,
  `/checkout` and descendants, and dedicated settings, stitching, or
  measurements routes.
- Keep the logo, search, account utilities, theme, wishlist, and cart available.
- On mobile, retain the utility drawer but omit its catalog accordion on those
  routes.

### `/shop` retirement

- Permanently redirect `/shop` to the default canonical department so old
  bookmarks and stored campaign links do not fail.
- Default the approved catalog pages and header to enabled when their
  environment variables are absent. An explicit `false` remains the emergency
  rollback switch for either layer.
- Remove `/shop` from the header, footer, home CTAs, cart/wishlist empty states,
  checkout recovery links, global search, structured data, and sitemap.
- Build the sitemap from approved canonical catalog navigation paths.

## Verification plan

1. Pure tests for route visibility, season eligibility, price constants, and
   canonical search destinations.
2. Source-level guards against reintroducing listing-card galleries, the
   Department & Collection selector, or `/shop` sitemap URLs.
3. Catalog interaction checks for search, grid density, and independent filter
   scrolling.
4. TypeScript, Prisma validation, focused regression tests, and a production
   build.
5. Desktop and mobile browser checks for catalog, account, checkout, Quick View,
   product detail, and the `/shop` redirect.

## Accessibility references

- [WAI-ARIA multi-thumb slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/)
- [WAI-ARIA landmark guidance](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)
- [MDN `overflow-y`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overflow-y)
