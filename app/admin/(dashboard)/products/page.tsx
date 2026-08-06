import ProductListPage from "@/components/admin/product-list-page";

const STOCK_FILTERS = [
  "all",
  "in-stock",
  "low-stock",
  "out-of-stock",
] as const;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const initialStockFilter = STOCK_FILTERS.includes(
    filter as (typeof STOCK_FILTERS)[number]
  )
    ? (filter as (typeof STOCK_FILTERS)[number])
    : "all";

  return <ProductListPage initialStockFilter={initialStockFilter} />;
}

