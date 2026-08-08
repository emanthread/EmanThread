"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import {
  CATALOG_PRICE_MAX,
  CATALOG_PRICE_MIN,
  CATALOG_PRICE_STEP,
  CATALOG_SEASON_OPTIONS,
  colorFilterCopy,
  supportsColorFilter,
  supportsOptionsFilter,
  supportsSeasonFilter,
} from "@/lib/catalog-filter-options";
import { productKindLabel } from "@/lib/commerce";
import type { CatalogPageData } from "@/lib/db/catalog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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

type CatalogDataProps = Pick<CatalogFiltersProps, "data">;

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

function formatCatalogPrice(value: number): string {
  return `PKR ${value.toLocaleString("en-PK")}`;
}

function CatalogPriceRange({
  query,
}: {
  query: CatalogPageData["query"];
}) {
  const initialMinimum = Math.min(
    CATALOG_PRICE_MAX,
    Math.max(CATALOG_PRICE_MIN, query.minPrice ?? CATALOG_PRICE_MIN)
  );
  const initialMaximum = Math.min(
    CATALOG_PRICE_MAX,
    Math.max(initialMinimum, query.maxPrice ?? CATALOG_PRICE_MAX)
  );
  const [range, setRange] = useState<[number, number]>([
    initialMinimum,
    initialMaximum,
  ]);

  return (
    <fieldset>
      <legend className="mb-4 text-sm font-semibold uppercase tracking-wider">
        Price range
      </legend>
      <Slider
        value={range}
        onValueChange={(value) => setRange(value as [number, number])}
        min={CATALOG_PRICE_MIN}
        max={CATALOG_PRICE_MAX}
        step={CATALOG_PRICE_STEP}
        minStepsBetweenThumbs={1}
        thumbLabels={["Minimum price", "Maximum price"]}
        formatValue={formatCatalogPrice}
      />
      {range[0] > CATALOG_PRICE_MIN ? (
        <input type="hidden" name="minPrice" value={range[0]} />
      ) : null}
      {range[1] < CATALOG_PRICE_MAX ? (
        <input type="hidden" name="maxPrice" value={range[1]} />
      ) : null}
      <div className="mt-3 flex justify-between text-sm text-muted-foreground">
        <span>{formatCatalogPrice(range[0])}</span>
        <span>{formatCatalogPrice(range[1])}</span>
      </div>
    </fieldset>
  );
}

function CatalogSeasonChoices({
  idPrefix,
  selectedValue,
}: {
  idPrefix: string;
  selectedValue: string | undefined;
}) {
  const [selectedSeason, setSelectedSeason] = useState(selectedValue || "");

  return (
    <fieldset>
      <legend className="mb-4 text-sm font-semibold uppercase tracking-wider">
        Season
      </legend>
      <div className="space-y-3">
        {CATALOG_SEASON_OPTIONS.map((season) => {
          const id = `${idPrefix}-season-${season
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")}`;

          return (
            <label
              key={season}
              htmlFor={id}
              className="flex min-h-7 cursor-pointer items-center gap-3 text-sm"
            >
              <input
                id={id}
                type="checkbox"
                name="season"
                value={season}
                checked={selectedSeason === season}
                onChange={(event) => {
                  const form = event.currentTarget.form;
                  setSelectedSeason(event.currentTarget.checked ? season : "");
                  window.setTimeout(() => form?.requestSubmit(), 0);
                }}
                className="size-5 rounded border-input accent-primary"
              />
              <span>{season}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function CatalogFilterFields({
  data,
  idPrefix,
}: CatalogDataProps & { idPrefix: string }) {
  const { facets, node, query } = data;
  const department = node.path.split("/")[1];
  const showFabric = department !== "fragrance-beauty" && facets.fabrics.length > 1;
  const showSeason = supportsSeasonFilter(node.path, facets.productKinds);
  const showKinds = facets.productKinds.length > 1;
  const optionValues = facets.optionGroups.flatMap((group) => group.values);
  const optionLabel =
    facets.optionGroups.length === 1
      ? facets.optionGroups[0].label
      : "Size, volume & options";
  const showColor =
    supportsColorFilter(node.path, node.productKind) && facets.colors.length > 1;
  const showOptions =
    supportsOptionsFilter(node.path, node.productKind) && optionValues.length > 0;
  const colorCopy = colorFilterCopy(node.path);
  const submitSelection = (
    event: ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => event.currentTarget.form?.requestSubmit();

  return (
    <>
      {query.sort !== "featured" && (
        <input type="hidden" name="sort" value={query.sort} />
      )}
      {query.search ? (
        <input type="hidden" name="q" value={query.search} />
      ) : null}
      {query.categoryIds?.length ? (
        <input type="hidden" name="category" value={query.categoryIds.join(",")} />
      ) : null}

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

      {showOptions ? (
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

      <CatalogPriceRange
        key={`${query.minPrice ?? CATALOG_PRICE_MIN}-${
          query.maxPrice ?? CATALOG_PRICE_MAX
        }`}
        query={query}
      />

      {showColor ? (
        <div className="space-y-2">
          <label htmlFor={`${idPrefix}-color`} className="text-sm font-semibold uppercase tracking-wider">
            {colorCopy.label}
          </label>
          <select
            id={`${idPrefix}-color`}
            name="color"
            defaultValue={query.color || ""}
            onChange={submitSelection}
            className={selectClassName}
          >
            <option value="">{colorCopy.allLabel}</option>
            {currentValue(facets.colors, query.color).map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showSeason ? (
        <CatalogSeasonChoices
          key={query.season || "all-seasons"}
          idPrefix={idPrefix}
          selectedValue={query.season}
        />
      ) : null}

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
}: CatalogDataProps & { idPrefix: string; compact?: boolean }) {
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
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const scrollFilters = (direction: -1 | 1) => {
    desktopScrollRef.current?.scrollBy({
      top: direction * 320,
      behavior: "smooth",
    });
  };

  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:block" aria-label="Catalog filters">
        <div className="sticky top-[calc(var(--catalog-header-height,7rem)+1rem)] flex max-h-[calc(100dvh-var(--catalog-header-height,7rem)-2rem)] flex-col overflow-hidden rounded-xl border border-border bg-card/40">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              Scroll filters
            </span>
            <div className="flex items-center gap-1" role="group" aria-label="Scroll filter panel">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Scroll filters up"
                onClick={() => scrollFilters(-1)}
              >
                <ChevronUp aria-hidden="true" className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Scroll filters down"
                onClick={() => scrollFilters(1)}
              >
                <ChevronDown aria-hidden="true" className="size-4" />
              </Button>
            </div>
          </div>
          <div
            ref={desktopScrollRef}
            tabIndex={0}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 [scrollbar-width:thin]"
            aria-label="Scrollable product filters"
          >
            <div className="space-y-7">
              <div className="flex items-center justify-between gap-3">
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
          </div>
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
