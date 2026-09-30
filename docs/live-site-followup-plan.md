# Live-site follow-up

Verified: catalog and commerce schema is readable; 104 of 519 products have no primary assignment. The admin flag also controls purchase inference. Unrelated edits currently resubmit one assignment. Some uploaders skip image preparation, and products lack a Replace action.

Plan:
1. Default category tools on with explicit false rollback. Preserve the old storefront/checkout opt-in.
2. Require category selection for new products and deliberate category changes; omit assignment writes for unrelated existing-product edits.
3. Pass supported undecodable images through when within the 10 MB server limit, reject oversized files clearly, and preserve GIF animation.
4. Share image preparation across homepage, hero, featured category, and header card uploads.
5. Replace only the selected product image after upload succeeds; preserve the original on failure.
6. Run focused tests, full static suite, TypeScript and production build, review, commit and push.

No database migration or bulk content update. Deployment/CDN invalidation is separate from the code push.

## Findings on the nine reported issues

| Report | Verified result |
| --- | --- |
| Categories / Department missing | The previous flag required an explicit true value. Admin tools now default on; explicit false still disables them. Production build-time environment has not been inspected. |
| Images fail to upload or change | A supported 8 MB HEIC was rejected when the browser could not decode it. Files within the server's 10 MB limit now proceed to storage. CMS uploaders share preparation, and product images have a Replace action. Configured Cloudinary credentials passed a read-only connectivity check; production upload behavior still needs verification after deployment. |
| Posters / banners missing | Visible homepage images were present in the inspected desktop and mobile pages. Some records are hidden by saved settings; they were not republished automatically. |
| Desktop Shop / Categories / Discover More missing | Inspected Women content showed seven category cards and five banners on both viewports. Discover More is banner copy, not a separate section. Seasonal product requests had a malformed path, fixed in the earlier branch commit. |
| Different mobile and desktop content | Separate responsive assets/settings are supported. Missing desktop assets already fall back to mobile images. No missing visible content was reproduced in the inspected configurations. |
| Different browsers / devices | Shared caching of the live admin login was observed. Earlier branch changes add private no-store headers; a fresh deployment and CDN verification remain necessary. |
| Admin login failures | No authenticated failure was reproduced. Cache protection addresses a verified risk; device-specific login success cannot be claimed without a post-deployment authenticated check. |
| Changes delayed by five minutes | App content has a 300-second cache, but successful admin saves already invalidate the affected data and page. A five-minute delay after every save is not established. Hosting/CDN behavior remains a deployment check. |
| Same image cannot be uploaded again | Existing inputs already reset. The new replacement browser regression confirms selecting the same file after a failed upload works and preserves the other gallery images. |

## Additional corrections from verification

- Unrelated product edits omit catalog assignments, preserving all existing placements and featured/order metadata.
- Existing products without a primary assignment can save ordinary edits. New products and deliberate category changes still require a valid leaf category.
- Product details and checkout keep the previous explicit opt-in for catalog-based purchase inference.
- Fabric selectors ignore empty native events that were clearing their loaded value without a selection.
- Existing non-fabric products can retain their established category when creating a commerce profile during an ordinary save.

## Verification and release scope

- 205 static regression checks passed on the final code.
- Three isolated Chromium editor regressions passed: legacy save, assignment preservation, and failed image replacement followed by retry.
- TypeScript check and production build passed. The build used an unreachable local database to prevent live data writes.
- Compiled-server checks passed: login returned 200, auth CSRF returned 200, and unauthenticated profile returned 401; all three returned private no-store cache headers.
- Independent review finding was corrected and re-reviewed.
- Browser API writes were mocked; its server used a dummy local database and test-only auth secret.
- No schema migration, production content write, real image upload, or authenticated production login was performed.
- ESLint is not installed in this checkout, so the lint script could not be used.
- Release remains separate from pushing this branch: rebuild on the host, confirm any explicit feature-flag overrides, check private admin/auth headers through the CDN, and verify a real admin upload/save/login.
