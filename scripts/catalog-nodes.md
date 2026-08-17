# CatalogNode bootstrap and validator

`catalog-nodes.ts` builds its node manifest only from explicit catalog hrefs in
`lib/navigation/catalog-menu.ts`. It never slugifies a label or invents a
customer route. The four department roots are explicitly declared in the
script.

The script can write only `CatalogNode`. It has no Product, Category,
FabricType, assignment, delete, or deactivation operation.

## Hierarchy

- Departments, routed sections, and routed leaves become nodes.
- Menu groups are presentation-only because they have no approved canonical
  URLs. Leaves are therefore parented directly to their routed section, with
  group/item ordering flattened into one deterministic sibling order.
- A menu item that links to its own section or into another configured section
  is a navigation reference, not a second structural node. Every reference
  must resolve to a canonical manifest path or the plan is rejected.
- Visual cards reference existing structural paths; they do not create nodes.
- IDs use the deterministic form `catalog:<type>:<contextual-config-id>`.

New nodes are active so assignments can begin, but remain invisible and
noindex:

```text
isActive=true, isVisible=false, indexable=false
```

Reruns update only reviewed structural fields (`parentId`, type, product
behavior, label, explicit path/segment, and order). They preserve operator-managed activity/publication,
visibility, SEO, banner, description, featured-content, and canonical fields.
Rows not present in the manifest are not changed or deleted.

## Operator workflow

All commands require a configured `DATABASE_URL` except the default plan.

1. Generate and review the deterministic, no-database manifest:

   ```powershell
   npx tsx scripts/catalog-nodes.ts
   ```

2. Review the target database changes with the read-only bootstrap dry-run:

   ```powershell
   npx tsx scripts/catalog-nodes.ts --mode=bootstrap
   ```

   Record the `databasePlanReviewHash`; it binds the current manifest, exact
   database-derived actions/conflicts, create defaults, update field set,
   preservation policy, and transaction policy.

   When a release must apply only one reviewed catalog branch, scope both the
   dry-run and apply command to the same canonical path:

   ```powershell
   npx tsx scripts/catalog-nodes.ts --mode=bootstrap --scope=/men/ready-to-wear
   ```

3. Apply only after reviewing both outputs. Use the exact database-plan
   SHA-256 printed by step 2:

   ```powershell
   $env:CATALOG_BOOTSTRAP_APPLY="I_ACKNOWLEDGE_CATALOGNODE_ONLY_WRITES"
   npx tsx scripts/catalog-nodes.ts --mode=bootstrap --apply --reviewed-plan=<sha256>
   Remove-Item Env:CATALOG_BOOTSTRAP_APPLY
   ```

   If step 2 used `--scope`, include that exact same `--scope` value in the
   apply command. A scoped and unscoped dry-run produce different review
   hashes, so they cannot be accidentally interchanged.

Apply recomputes the database plan inside a serializable transaction before
any upsert. It aborts if that plan differs from the reviewed dry-run or if a
path belongs to a non-manifest ID, rather than adopting or overwriting that
row. The transaction upserts parent-first by deterministic ID, making an
unchanged rerun a no-op; concurrent drift causes an abort rather than an
unreviewed write.

## Disposable config/DB validation

Validation is a separate read-only mode. It checks that every visible, active,
non-coming-soon catalog config href—including explicit department roots—has a
`CatalogNode.path` that is both active and visible, matching page-resolution
requirements. Active but invisible staged paths and active/visible
database-only paths are reported separately for operator review. Legacy
utility links such as Shop All and Stitching are outside the catalog-node
comparison.

It refuses to run unless the operator confirms a disposable database in both
the environment and CLI:

```powershell
$env:CATALOG_DISPOSABLE_DATABASE="I_CONFIRM_THIS_DATABASE_IS_DISPOSABLE"
npx tsx scripts/catalog-nodes.ts --mode=validate --confirm-disposable
Remove-Item Env:CATALOG_DISPOSABLE_DATABASE
```

Confirm the actual connection target independently before setting either
acknowledgement. Do not use validation as proof that a migration, assignment,
SEO review, or legacy-data invariant has passed.
