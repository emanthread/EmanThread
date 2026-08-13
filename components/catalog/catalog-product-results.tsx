"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Grid3X3,
  LayoutGrid,
  PackageOpen,
  Search,
} from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CatalogPageData } from "@/lib/db/catalog";
import type { Product } from "@/lib/data";
import { cn } from "@/lib/utils";

type CatalogProductResultsProps = {
  path: string;
  products: Product[];
  query: CatalogPageData["query"];
  total: number;
  hasFilters: boolean;
  indexable: boolean;
};

type PreservedFieldsProps = {
  query: CatalogPageData["query"];
  omit: "search" | "sort";
};

function PreservedCatalogFields({ query, omit }: PreservedFieldsProps) {
  return (
    <>
      {omit !== "search" && query.search ? (
        <input type="hidden" name="q" value={query.search} />
      ) : null}
      {omit !== "sort" && query.sort !== "featured" ? (
        <input type="hidden" name="sort" value={query.sort} />
      ) : null}
      {query.fabricType ? (
        <input type="hidden" name="fabric" value={query.fabricType} />
      ) : null}
      {query.color ? (
        <input type="hidden" name="color" value={query.color} />
      ) : null}
      {query.season ? (
        <input type="hidden" name="season" value={query.season} />
      ) : null}
      {query.productKind ? (
        <input type="hidden" name="kind" value={query.productKind} />
      ) : null}
      {query.option ? (
        <input type="hidden" name="option" value={query.option} />
      ) : null}
      {query.minPrice !== undefined ? (
        <input type="hidden" name="minPrice" value={query.minPrice} />
      ) : null}
      {query.maxPrice !== undefined ? (
        <input type="hidden" name="maxPrice" value={query.maxPrice} />
      ) : null}
      {query.inStock ? (
        <input type="hidden" name="inStock" value="true" />
      ) : null}
      {query.categoryIds?.length ? (
        <input
          type="hidden"
          name="category"
          value={query.categoryIds.join(",")}
        />
      ) : null}
    </>
  );
}

export function CatalogProductResults({
  path,
  products,
  query,
  total,
  hasFilters,
  indexable,
}: CatalogProductResultsProps) {
  const [gridDensity, setGridDensity] = useState<"compact" | "comfortable">(
    "compact"
  );

  return (
    <>
      <div className="mb-8 flex flex-col items-stretch justify-center gap-3 rounded-xl border border-border bg-card/60 p-4 sm:flex-row sm:flex-wrap sm:items-center lg:p-5">
        <form
          action={path}
          method="get"
          role="search"
          aria-label="Search this collection"
          className="relative w-full sm:w-64"
        >
          <PreservedCatalogFields query={query} omit="search" />
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            name="q"
            defaultValue={query.search}
            maxLength={100}
            placeholder="Search products..."
            className="h-11 rounded-sm pl-10"
          />
        </form>

        <div
          className="flex h-11 overflow-hidden rounded-md border border-border"
          role="group"
          aria-label="Product grid size"
        >
          <button
            type="button"
            aria-label="Show more products per row"
            aria-pressed={gridDensity === "compact"}
            className={cn(
              "flex w-11 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              gridDensity === "compact"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            )}
            onClick={() => setGridDensity("compact")}
          >
            <Grid3X3 aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Show larger product cards"
            aria-pressed={gridDensity === "comfortable"}
            className={cn(
              "flex w-11 items-center justify-center border-l border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              gridDensity === "comfortable"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            )}
            onClick={() => setGridDensity("comfortable")}
          >
            <LayoutGrid aria-hidden="true" className="size-4" />
          </button>
        </div>

        <form action={path} method="get" className="relative w-full sm:w-56">
          <PreservedCatalogFields query={query} omit="sort" />
          <label className="sr-only" htmlFor="catalog-sort">
            Sort products
          </label>
          <select
            id="catalog-sort"
            name="sort"
            defaultValue={query.sort}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            className="h-11 w-full appearance-none rounded-sm border border-input bg-background px-4 pr-10 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="trending">Trending</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="name-asc">Name: A to Z</option>
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
        </form>
      </div>

      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            id="catalog-products-heading"
            className="font-serif text-2xl font-semibold"
          >
            Products
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} {total === 1 ? "product" : "products"}
          </p>
        </div>
        {process.env.NODE_ENV === "development" && !indexable ? (
          <p className="text-xs text-muted-foreground">
            Preview collection — not indexed
          </p>
        ) : null}
      </div>

      {products.length ? (
        <div
          data-grid-density={gridDensity}
          className={cn(
            "grid gap-x-4 gap-y-8",
            gridDensity === "compact"
              ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
              : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
          )}
        >
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              priority={index < 2}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <PackageOpen
            aria-hidden="true"
            className="mx-auto mb-4 size-10 text-muted-foreground"
          />
          <h3 className="font-serif text-xl font-semibold">
            {hasFilters
              ? "No products match these filters"
              : "This collection is being prepared"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {hasFilters
              ? "Try clearing one or more filters to see other assigned products."
              : "Products will appear here after they are assigned to this collection in the catalog."}
          </p>
          {hasFilters ? (
            <Button variant="outline" asChild className="mt-5">
              <Link href={path}>Clear filters</Link>
            </Button>
          ) : null}
        </div>
      )}
    </>
  );
}
