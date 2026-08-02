"use client";

import Link from "next/link";
import type { ChangeEvent } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { productKindLabel } from "@/lib/commerce";
import type { CatalogPageData } from "@/lib/db/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type CatalogFiltersProps = {
  data: CatalogPageData;
};

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function activeFilterCount(query: CatalogPageData["query"]): number {
  return [
    query.search,
    query.fabricType,
    query.color,
    query.season,
    query.productKind,
    query.option,
    query.minPrice,
    query.maxPrice,
    query.inStock,
    query.categoryIds?.length,
  ].filter(Boolean).length;
}

function currentValue(
  values: string[],
  value: string | undefined
): string[] {
  return value && !values.some((item) => item.toLowerCase() === value.toLowerCase())
    ? [value, ...values]
    : values;
}

function CatalogFilterFields({
  data,
  idPrefix,
}: CatalogFiltersProps & { idPrefix: string }) {
  const { facets, node, query } = data;
  const department = node.path.split("/")[1];
  const showFabric = department !== "fragrance-beauty" && facets.fabrics.length > 1;
  const showSeason = department !== "fragrance-beauty" && facets.seasons.length > 0;
  const showKinds = facets.productKinds.length > 1;
  const optionValues = facets.optionGroups.flatMap((group) => group.values);
  const optionLabel =
    facets.optionGroups.length === 1
      ? facets.optionGroups[0].label
      : "Size, volume & options";
  const submitSelection = (
    event: ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => event.currentTarget.form?.requestSubmit();

  return (
    <>
      {query.sort !== "featured" && (
        <input type="hidden" name="sort" value={query.sort} />
      )}
      {query.categoryIds?.length ? (
        <input type="hidden" name="category" value={query.categoryIds.join(",")} />
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor={`${idPrefix}-search`}
          className="text-sm font-semibold uppercase tracking-wider"
        >
          Search
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id={`${idPrefix}-search`}
            type="search"
            name="q"
            defaultValue={query.search}
            maxLength={100}
            placeholder="Name or SKU"
            className="pl-9"
          />
        </div>
      </div>

      {showKinds ? (
        <div className="space-y-2">
          <label htmlFor={`${idPrefix}-kind`} className="text-sm font-semibold uppercase tracking-wider">
            Product type
          </label>
          <select
            id={`${idPrefix}-kind`}
            name="kind"
            defaultValue={query.productKind || ""}
            onChange={submitSelection}
            className={selectClassName}
          >
            <option value="">All types</option>
            {facets.productKinds.map((kind) => (
              <option key={kind} value={kind}>
                {productKindLabel(kind)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showFabric ? (
        <div className="space-y-2">
          <label htmlFor={`${idPrefix}-fabric`} className="text-sm font-semibold uppercase tracking-wider">
            Fabric
          </label>
          <select
            id={`${idPrefix}-fabric`}
            name="fabric"
            defaultValue={query.fabricType || ""}
            onChange={submitSelection}
            className={selectClassName}
          >
            <option value="">All fabrics</option>
            {currentValue(facets.fabrics, query.fabricType).map((fabric) => (
              <option key={fabric} value={fabric}>
                {fabric}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {optionValues.length ? (
        <div className="space-y-2">
          <label htmlFor={`${idPrefix}-option`} className="text-sm font-semibold uppercase tracking-wider">
            {optionLabel}
          </label>
          <select
            id={`${idPrefix}-option`}
            name="option"
            defaultValue={query.option || ""}
            onChange={submitSelection}
            className={selectClassName}
          >
            <option value="">All options</option>
            {facets.optionGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {currentValue(group.values, query.option).map((option) => (
                  <option key={`${group.label}-${option}`} value={option}>
                    {option}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      ) : null}

      {facets.colors.length > 1 ? (
        <div className="space-y-2">
          <label htmlFor={`${idPrefix}-color`} className="text-sm font-semibold uppercase tracking-wider">
            Color
          </label>
          <select
            id={`${idPrefix}-color`}
            name="color"
            defaultValue={query.color || ""}
            onChange={submitSelection}
            className={selectClassName}
          >
            <option value="">All colors</option>
            {currentValue(facets.colors, query.color).map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showSeason ? (
        <div className="space-y-2">
          <label htmlFor={`${idPrefix}-season`} className="text-sm font-semibold uppercase tracking-wider">
            Season
          </label>
          <select
            id={`${idPrefix}-season`}
            name="season"
            defaultValue={query.season || ""}
            onChange={submitSelection}
            className={selectClassName}
          >
            <option value="">All seasons</option>
            {currentValue(facets.seasons, query.season).map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold uppercase tracking-wider">
          Price range
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <Input
            aria-label="Minimum price"
            type="number"
            name="minPrice"
            min={0}
            step="1"
            defaultValue={query.minPrice}
            placeholder="Min"
          />
          <Input
            aria-label="Maximum price"
            type="number"
            name="maxPrice"
            min={0}
            step="1"
            defaultValue={query.maxPrice}
            placeholder="Max"
          />
        </div>
      </fieldset>

      <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="inStock"
          value="true"
          defaultChecked={query.inStock}
          onChange={submitSelection}
          className="size-4 rounded border-input accent-primary"
        />
        In-stock products only
      </label>
    </>
  );
}

function CatalogFilterForm({
  data,
  idPrefix,
  compact = false,
}: CatalogFiltersProps & { idPrefix: string; compact?: boolean }) {
  return (
    <form
      action={data.node.path}
      method="get"
      className={compact ? "space-y-6" : "space-y-7"}
      aria-label="Filter catalog products"
    >
      <CatalogFilterFields data={data} idPrefix={idPrefix} />
      <div className="flex gap-2 border-t border-border pt-5">
        <Button type="submit" className="flex-1">
          Apply filters
        </Button>
        <Button variant="outline" asChild>
          <Link href={data.node.path}>Clear</Link>
        </Button>
      </div>
    </form>
  );
}

/** Desktop sidebar plus an equivalent left-hand drawer on smaller screens. */
export function CatalogFilters({ data }: CatalogFiltersProps) {
  const count = activeFilterCount(data.query);

  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:block" aria-label="Catalog filters">
        <div className="sticky top-28 border-r border-border pr-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl font-semibold">Filters</h2>
            {count ? (
              <Link
                href={data.node.path}
                className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Clear all
              </Link>
            ) : null}
          </div>
          <CatalogFilterForm data={data} idPrefix="catalog-desktop" />
        </div>
      </aside>

      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <SlidersHorizontal aria-hidden="true" className="size-4" />
                Filters
              </span>
              {count ? <span className="text-xs">{count} applied</span> : null}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full max-w-sm gap-0 overflow-y-auto p-0">
            <SheetHeader className="border-b border-border pr-12">
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Refine {data.node.label} without leaving this collection.
              </SheetDescription>
            </SheetHeader>
            <div className="p-5">
              <CatalogFilterForm data={data} idPrefix="catalog-mobile" compact />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

function SortPreservedFields({ query }: { query: CatalogPageData["query"] }) {
  return (
    <>
      {query.search ? <input type="hidden" name="q" value={query.search} /> : null}
      {query.fabricType ? <input type="hidden" name="fabric" value={query.fabricType} /> : null}
      {query.color ? <input type="hidden" name="color" value={query.color} /> : null}
      {query.season ? <input type="hidden" name="season" value={query.season} /> : null}
      {query.productKind ? <input type="hidden" name="kind" value={query.productKind} /> : null}
      {query.option ? <input type="hidden" name="option" value={query.option} /> : null}
      {query.minPrice !== undefined ? <input type="hidden" name="minPrice" value={query.minPrice} /> : null}
      {query.maxPrice !== undefined ? <input type="hidden" name="maxPrice" value={query.maxPrice} /> : null}
      {query.inStock ? <input type="hidden" name="inStock" value="true" /> : null}
      {query.categoryIds?.length ? (
        <input type="hidden" name="category" value={query.categoryIds.join(",")} />
      ) : null}
    </>
  );
}

/** Sorting is kept beside the product grid; it never replaces the grid. */
export function CatalogSort({ data }: CatalogFiltersProps) {
  return (
    <form action={data.node.path} method="get">
      <SortPreservedFields query={data.query} />
      <label className="sr-only" htmlFor="catalog-sort">
        Sort products
      </label>
      <select
        id="catalog-sort"
        name="sort"
        defaultValue={data.query.sort}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className={selectClassName}
      >
        <option value="featured">Featured</option>
        <option value="newest">Newest</option>
        <option value="trending">Trending</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
        <option value="name-asc">Name: A to Z</option>
      </select>
    </form>
  );
}
