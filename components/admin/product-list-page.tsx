"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Copy,
  Download,
  Edit,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useAdminStore, type AdminProduct } from "@/lib/admin-store";
import { useAuthStore } from "@/lib/auth-store";
import { adminFetch } from "@/lib/admin-fetch";
import { catalogPathBreadcrumb } from "@/lib/catalog-product-classification";
import { formatPrice } from "@/lib/data";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn, getProductImage } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 50;
type StockFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";

function csvCell(value: string | number | undefined) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function categoryLabel(product: AdminProduct) {
  if (product.primaryCatalogCategory?.path) {
    return catalogPathBreadcrumb(product.primaryCatalogCategory.path);
  }
  return product.fabricType || "Not assigned";
}

export default function ProductListPage({
  initialStockFilter = "all",
}: {
  initialStockFilter?: StockFilter;
}) {
  const {
    products,
    productsTotal,
    productStats,
    productsPage,
    productsTotalPages,
    loadProducts,
    updateProductStock,
    deleteProduct,
  } = useAdminStore();
  const user = useAuthStore((state) => state.user);
  const canManageProducts = Boolean(
    user &&
      hasPermission(user.role, Permission.MANAGE_PRODUCTS, user.permissions)
  );

  const [fabricTypes, setFabricTypes] = useState<
    { id: string; name: string; isActive: boolean }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fabricFilter, setFabricFilter] = useState("all");
  const [stockFilter, setStockFilter] =
    useState<StockFilter>(initialStockFilter);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [editStockProduct, setEditStockProduct] = useState<string | null>(null);
  const [newStockValue, setNewStockValue] = useState("0");
  const [bulkStockValue, setBulkStockValue] = useState("");
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [productToArchive, setProductToArchive] = useState<AdminProduct | null>(
    null
  );
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);
  const stockEditableProducts = useMemo(
    () => products.filter((product) => !product.usesVariantInventory),
    [products]
  );

  useEffect(() => {
    setStockFilter(initialStockFilter);
  }, [initialStockFilter]);

  const loadFabricTypes = useCallback(async (signal?: AbortSignal) => {
    const response = await adminFetch("/api/admin/fabric-types?active=true", {
      signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(data)) {
      throw new Error(data?.error || "Failed to load fabric filters");
    }
    setFabricTypes(data);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadFabricTypes(controller.signal).catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(
        error instanceof Error ? error.message : "Failed to load filters"
      );
    });
    return () => controller.abort();
  }, [loadFabricTypes]);

  useEffect(() => {
    const controller = new AbortController();
    void loadProducts(
      1,
      PAGE_SIZE,
      debouncedSearch,
      fabricFilter,
      stockFilter,
      controller.signal
    );
    setSelectedProducts([]);
    return () => controller.abort();
  }, [loadProducts, debouncedSearch, fabricFilter, stockFilter]);

  const reloadCurrentPage = useCallback(async () => {
    const loaded = await loadProducts(
      productsPage,
      PAGE_SIZE,
      debouncedSearch,
      fabricFilter,
      stockFilter
    );
    if (!loaded) return false;

    const latest = useAdminStore.getState();
    const lastValidPage = Math.max(1, latest.productsTotalPages);
    if (latest.productsPage > lastValidPage) {
      return loadProducts(
        lastValidPage,
        PAGE_SIZE,
        debouncedSearch,
        fabricFilter,
        stockFilter
      );
    }
    return true;
  }, [loadProducts, productsPage, debouncedSearch, fabricFilter, stockFilter]);

  const handlePageChange = async (page: number) => {
    setSelectedProducts([]);
    await loadProducts(
      page,
      PAGE_SIZE,
      debouncedSearch,
      fabricFilter,
      stockFilter
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [productsLoaded] = await Promise.all([
        reloadCurrentPage(),
        loadFabricTypes(),
      ]);
      if (!productsLoaded) return;
      toast.success("Products refreshed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to refresh products"
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateStock = async () => {
    if (!editStockProduct) return;
    if (
      products.find((product) => product.id === editStockProduct)
        ?.usesVariantInventory
    ) {
      toast.error("Update this product's option stock in the full editor");
      setEditStockProduct(null);
      return;
    }
    const quantity = Number(newStockValue);
    if (!Number.isInteger(quantity) || quantity < 0) {
      toast.error("Stock must be a whole number of 0 or more");
      return;
    }

    setIsUpdatingStock(true);
    try {
      await updateProductStock(editStockProduct, quantity);
      await reloadCurrentPage();
      setEditStockProduct(null);
      toast.success("Stock updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update stock"
      );
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const handleBulkStockUpdate = async (quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 0) {
      toast.error("Stock must be a whole number of 0 or more");
      return;
    }
    const editableIds = new Set(
      stockEditableProducts.map((product) => product.id)
    );
    const productIds = selectedProducts.filter((id) => editableIds.has(id));
    if (productIds.length === 0) return;

    setIsBulkUpdating(true);
    const results = await Promise.allSettled(
      productIds.map((productId) =>
        updateProductStock(productId, quantity)
      )
    );
    const failures = results.filter(
      (result) => result.status === "rejected"
    ).length;

    try {
      await reloadCurrentPage();
    } finally {
      setIsBulkUpdating(false);
      setSelectedProducts([]);
    }

    if (failures > 0) {
      toast.error(
        `${failures} of ${results.length} stock updates failed. Successful updates were kept.`
      );
    } else {
      toast.success(`Stock updated for ${results.length} products`);
    }
  };

  const handleArchiveProduct = async () => {
    if (!productToArchive) return;
    setIsArchiving(true);
    try {
      await deleteProduct(productToArchive.id);
      setProductToArchive(null);
      await reloadCurrentPage();
    } catch {
      // The store reports the API error and the dialog stays open for retry.
    } finally {
      setIsArchiving(false);
    }
  };

  const handleExportProducts = () => {
    const rows = [
      ["Product ID", "Name", "SKU", "Category", "Price", "Stock"],
      ...products.map((product) => [
        product.id,
        product.name,
        product.sku,
        categoryLabel(product),
        product.price,
        product.stockQuantity,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "products-current-page.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-muted-foreground">
            Find a product, check stock, or open its full editor.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn(
                "mr-2 h-4 w-4",
                isRefreshing && "animate-spin"
              )}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleExportProducts}
            disabled={products.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export current page
          </Button>
          {canManageProducts && (
            <Button asChild>
              <Link href="/admin/products/new">
                <Plus className="mr-2 h-4 w-4" />
                Add product
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["all", "Total", productStats.total, "text-foreground"],
            [
              "in-stock",
              "In stock",
              productStats.inStock,
              "text-emerald-600",
            ],
            [
              "low-stock",
              "Low stock",
              productStats.lowStock,
              "text-amber-600",
            ],
            [
              "out-of-stock",
              "Out of stock",
              productStats.outOfStock,
              "text-red-600",
            ],
          ] as const
        ).map(([filter, label, count, color]) => (
          <Card
            key={filter}
            className={cn(
              "overflow-hidden",
              stockFilter === filter && "border-primary"
            )}
          >
            <button
              type="button"
              className="w-full p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              aria-pressed={stockFilter === filter}
              onClick={() => setStockFilter(filter)}
            >
              <p className={cn("text-2xl font-semibold", color)}>{count}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </button>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label="Search products"
                placeholder="Search name or SKU"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={fabricFilter} onValueChange={setFabricFilter}>
              <SelectTrigger
                className="w-full sm:w-44"
                aria-label="Filter by fabric"
              >
                <SelectValue placeholder="Fabric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All fabrics</SelectItem>
                {fabricTypes.map((fabricType) => (
                  <SelectItem key={fabricType.id} value={fabricType.name}>
                    {fabricType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={stockFilter}
              onValueChange={(value) => setStockFilter(value as StockFilter)}
            >
              <SelectTrigger
                className="w-full sm:w-44"
                aria-label="Filter by stock"
              >
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stock</SelectItem>
                <SelectItem value="in-stock">In stock</SelectItem>
                <SelectItem value="low-stock">Low stock</SelectItem>
                <SelectItem value="out-of-stock">Out of stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {canManageProducts && selectedProducts.length > 0 && (
            <div className="flex flex-col gap-3 border-b bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium">
                {selectedProducts.length} selected
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor="bulk-stock" className="text-sm">
                  Set stock to
                </Label>
                <Input
                  id="bulk-stock"
                  inputMode="numeric"
                  type="number"
                  min="0"
                  step="1"
                  value={bulkStockValue}
                  onChange={(event) => setBulkStockValue(event.target.value)}
                  className="h-9 w-24"
                  disabled={isBulkUpdating}
                />
                <Button
                  size="sm"
                  onClick={() =>
                    handleBulkStockUpdate(Number(bulkStockValue))
                  }
                  disabled={isBulkUpdating || bulkStockValue.trim() === ""}
                >
                  {isBulkUpdating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Apply
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStockUpdate(0)}
                  disabled={isBulkUpdating}
                >
                  Mark out of stock
                </Button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  {canManageProducts && (
                    <th className="w-12 p-4 text-left">
                      <Checkbox
                        aria-label="Select all products on this page"
                        checked={
                          stockEditableProducts.length > 0 &&
                          selectedProducts.length === stockEditableProducts.length
                        }
                        onCheckedChange={(checked) =>
                          setSelectedProducts(
                            checked === true
                              ? stockEditableProducts.map(
                                  (product) => product.id
                                )
                              : []
                          )
                        }
                      />
                    </th>
                  )}
                  <th className="p-4 text-left text-sm font-medium">Product</th>
                  <th className="hidden p-4 text-left text-sm font-medium md:table-cell">
                    Category
                  </th>
                  <th className="p-4 text-left text-sm font-medium">Price</th>
                  <th className="p-4 text-left text-sm font-medium">Stock</th>
                  <th className="w-12 p-4">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const isLowStock =
                    product.inStock &&
                    product.stockQuantity > 0 &&
                    product.stockQuantity <= product.lowStockThreshold;
                  const isOutOfStock =
                    !product.inStock || product.stockQuantity === 0;

                  return (
                    <tr
                      key={product.id}
                      className="border-t hover:bg-muted/30"
                    >
                      {canManageProducts && (
                        <td className="p-4">
                          <Checkbox
                            aria-label={`Select ${product.name}`}
                            checked={selectedProducts.includes(product.id)}
                            disabled={product.usesVariantInventory}
                            onCheckedChange={(checked) =>
                              setSelectedProducts((current) =>
                                checked === true
                                  ? Array.from(
                                      new Set([...current, product.id])
                                    )
                                  : current.filter((id) => id !== product.id)
                              )
                            }
                          />
                        </td>
                      )}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
                            <Image
                              src={getProductImage(product.images)}
                              alt=""
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-xs truncate font-medium">
                              {product.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {product.sku}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden max-w-xs p-4 text-sm md:table-cell">
                        <span className="line-clamp-2">
                          {categoryLabel(product)}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-medium">
                          {formatPrice(product.price)}
                        </p>
                        {product.originalPrice != null &&
                          product.originalPrice > product.price && (
                            <p className="text-sm text-muted-foreground line-through">
                              {formatPrice(product.originalPrice)}
                            </p>
                          )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "font-medium",
                              isOutOfStock && "text-red-600",
                              isLowStock && "text-amber-600"
                            )}
                          >
                            {product.stockQuantity}
                          </span>
                          {isOutOfStock && (
                            <Badge variant="destructive">Out</Badge>
                          )}
                          {isLowStock && (
                            <Badge
                              variant="outline"
                              className="border-amber-400 text-amber-700"
                            >
                              Low
                            </Badge>
                          )}
                          {product.usesVariantInventory && (
                            <Badge variant="outline">By option</Badge>
                          )}
                          {Boolean(product.lowStockVariantCount) && (
                            <Badge variant="outline" className="border-amber-400 text-amber-700">
                              {product.lowStockVariantCount} low combination{product.lowStockVariantCount === 1 ? "" : "s"}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Actions for ${product.name}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/product/${product.id}`}
                                target="_blank"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View on store
                              </Link>
                            </DropdownMenuItem>
                            {canManageProducts && (
                              <>
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/admin/products/${product.id}/edit`}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                {!product.usesVariantInventory && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditStockProduct(product.id);
                                      setNewStockValue(
                                        String(product.stockQuantity)
                                      );
                                    }}
                                  >
                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                    Update stock
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/admin/products/new?duplicate=${encodeURIComponent(
                                      product.id
                                    )}`}
                                  >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Duplicate
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => setProductToArchive(product)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Archive
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {products.length === 0 && (
            <div className="px-4 py-12 text-center">
              <p className="font-medium">No products found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try another search or clear a filter.
              </p>
            </div>
          )}

          {productsTotalPages > 1 && (
            <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {productsPage} of {productsTotalPages} · {productsTotal}{" "}
                matching products
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(productsPage - 1)}
                  disabled={productsPage <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(productsPage + 1)}
                  disabled={productsPage >= productsTotalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(editStockProduct)}
        onOpenChange={(open) => {
          if (!open && !isUpdatingStock) setEditStockProduct(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update stock</DialogTitle>
            <DialogDescription>
              Enter the quantity currently available for this product.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="stock-quantity">Stock quantity</Label>
            <Input
              id="stock-quantity"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={newStockValue}
              onChange={(event) => setNewStockValue(event.target.value)}
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditStockProduct(null)}
              disabled={isUpdatingStock}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateStock} disabled={isUpdatingStock}>
              {isUpdatingStock && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(productToArchive)}
        onOpenChange={(open) => {
          if (!open && !isArchiving) setProductToArchive(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive product?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{productToArchive?.name}</strong> will disappear from the
              admin and storefront product lists. Its order history will be kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleArchiveProduct();
              }}
              disabled={isArchiving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isArchiving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
