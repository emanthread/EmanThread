# Unstitched purchase flow

Unstitched products for Women, Men, and any future Teens unstitched branch use
the fabric-first purchase flow:

1. The customer chooses the product color by opening the relevant color product.
2. No garment size or size guide is shown or required.
3. The customer adds fabric to the cart.
4. At checkout, eligible fabric lines offer fabric-only checkout, an existing
   measurement profile, a new measurement profile, or an authorized
   admin-stored measurement.

Ready-to-wear, regular Teens apparel, fragrance, beauty, gifts, and accessories
must never show stitching controls at checkout.

## Existing product compatibility

Some existing products assigned only to unstitched catalog nodes carry stale
ready-to-wear commerce metadata and inactive historical size semantics. Runtime
purchase rules treat a product as unstitched when either:

- its commerce kind is `UNSTITCHED_FABRIC`; or
- every known catalog placement is an unstitched path.

The all-placements requirement prevents a genuine ready-to-wear product with a
single promotional placement from being reclassified. Existing products,
variants, inventory records, and order history are not deleted or rewritten.
