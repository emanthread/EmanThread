"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Columns,
  Grid3X3,
  PackageOpen,
  Square,
} from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import type { CatalogPageData } from "@/lib/db/catalog";
import type { Product } from "@/lib/data";
import { cn } from "@/lib/utils";
import { CatalogFilters } from "@/components/catalog/catalog-filters";

type CatalogProductResultsProps = {
  path: string;
  products: Product[];
  query: CatalogPageData["query"];
  total: number;
  hasFilters: boolean;
  indexable: boolean;
  data: CatalogPageData;
};

export function CatalogProductResults({
  path,
  products,
  query,
  total,
  hasFilters,
  indexable,
  data,
}: CatalogProductResultsProps) {
  const [gridDensity, setGridDensity] = useState<"1-col" | "2-col" | "4-col">(
    "4-col"
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {total} {total === 1 ? "Product" : "Products"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Grid View Toggles (1-col, 2-col, 4-col) */}
          <div
            className="flex items-center gap-0.5 rounded-md border border-border bg-background p-1"
            role="group"
            aria-label="Product grid view size"
          >
            <button
              type="button"
              aria-label="1 product per row"
              title="1 Column View"
              aria-pressed={gridDensity === "1-col"}
              className={cn(
                "flex size-8 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                gridDensity === "1-col"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setGridDensity("1-col")}
            >
              <Square aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              aria-label="2 products per row"
              title="2 Columns View"
              aria-pressed={gridDensity === "2-col"}
              className={cn(
                "flex size-8 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                gridDensity === "2-col"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setGridDensity("2-col")}
            >
              <Columns aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              aria-label="4 products per row"
              title="4 Columns View"
              aria-pressed={gridDensity === "4-col"}
              className={cn(
                "flex size-8 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                gridDensity === "4-col"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setGridDensity("4-col")}
            >
              <Grid3X3 aria-hidden="true" className="size-4" />
            </button>
          </div>

          {/* Slide-out Filter & Sort Trigger Drawer */}
          <CatalogFilters data={data} />
        </div>
      </div>

      {products.length ? (
        <div
          data-grid-density={gridDensity}
          className={cn(
            "grid gap-4 sm:gap-6 transition-all",
            gridDensity === "1-col" && "grid-cols-1 max-w-2xl mx-auto",
            gridDensity === "2-col" && "grid-cols-2",
            gridDensity === "4-col" && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
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
