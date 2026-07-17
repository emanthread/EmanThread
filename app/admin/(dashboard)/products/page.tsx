"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Copy,
  Download,
  RefreshCw,
  AlertTriangle,
  X,
  Video,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminStore, type AdminProduct } from "@/lib/admin-store";
import { adminFetch } from "@/lib/admin-fetch";
import { formatPrice } from "@/lib/data";
import { cn, getProductImage } from "@/lib/utils";

const badgeColors = {
  New: "bg-emerald-100 text-emerald-700",
  Trending: "bg-blue-100 text-blue-700",
  Hot: "bg-red-100 text-red-700",
  Limited: "bg-amber-100 text-amber-700",
  Featured: "bg-purple-100 text-purple-700",
};

const BADGES = ["NEW", "TRENDING", "HOT", "LIMITED", "FEATURED"] as const;

const PREDEFINED_TAGS = [
  "Summer",
  "Winter",
  "All Season",
  "Cotton",
  "Linen",
  "Silk",
  "Wool",
  "Festive",
  "Casual",
  "Formal",
  "Wedding",
  "Eid",
  "Premium",
  "Budget",
];

type ProductFormErrors = Partial<Record<keyof AdminProduct, string>>;

function ProductFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive" role="alert">{message}</p>;
}

function emptyProduct(): AdminProduct {
  return {
    id: "",
    name: "",
    sku: "",
    slug: "",
    price: 0,
    originalPrice: undefined,
    fabricType: "",
    color: "",
    colorHex: "#000000",
    images: [],
    videoUrl: undefined,
    badge: undefined,
    inStock: true,
    stockQuantity: 50,
    lowStockThreshold: 10,
    description: "",
    longDescription: "",
    metaTitle: "",
    metaDescription: "",
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function AdminProductsPage() {
  const { products, productsTotal, productsPage, productsTotalPages, updateProductStock, addProduct, updateProduct, loadProducts, deleteProduct } = useAdminStore();

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [fabricTypes, setFabricTypes] = useState<{ id: string; name: string; isActive: boolean }[]>([]);

  useEffect(() => {
    setIsLoadingCategories(true);
    const controller = new AbortController();
    // Use /api/admin/categories (not /api/categories) so we always get real
    // Category DB IDs. The public endpoint returns fabricType-grouped data
    // for shop filtering and must never be used as a categoryId source.
    // Also fetch fabric types so newly-created entries appear in the dropdown.
    // BUG FIX: dep was [loadProducts] — a stable Zustand action reference but
    // still caused an extra re-run on mount; changed to [] (run once on mount).
    const loadOptions = async () => {
      try {
        const fabricResponse = await adminFetch("/api/admin/fabric-types?active=true", {
          signal: controller.signal,
        });
        const fabricData = await fabricResponse.json().catch(() => null);
        if (!fabricResponse.ok || !Array.isArray(fabricData)) {
          throw new Error(fabricData?.error || "Failed to load fabric types");
        }
        setFabricTypes(fabricData);

        const categoryResponse = await adminFetch("/api/admin/categories", {
          signal: controller.signal,
        });
        const categoryData = await categoryResponse.json().catch(() => null);
        if (!categoryResponse.ok || !Array.isArray(categoryData)) {
          throw new Error(categoryData?.error || "Failed to load categories");
        }
        setCategories(categoryData);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        toast.error(error instanceof Error ? error.message : "Failed to load product options");
      } finally {
        setIsLoadingCategories(false);
      }
    };
    void loadOptions();
    return () => controller.abort();
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [editStockProduct, setEditStockProduct] = useState<string | null>(null);
  const [newStockValue, setNewStockValue] = useState<number>(0);
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [productForm, setProductForm] = useState<AdminProduct>(emptyProduct());
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [productToDelete, setProductToDelete] = useState<AdminProduct | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ProductFormErrors>({});
  // Replace manual setTimeout boilerplate with shared hook (same 500ms delay).
  // The hook already exists and is used correctly in customers/page.tsx.
  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => {
    const controller = new AbortController();
    loadProducts(1, 50, debouncedSearch, categoryFilter, stockFilter, controller.signal);
    // Abort the in-flight request if filters change before it resolves,
    // preventing stale responses from overwriting newer data.
    return () => controller.abort();
  }, [loadProducts, debouncedSearch, categoryFilter, stockFilter]);

  const handlePageChange = (newPage: number) => {
    loadProducts(newPage, 50, debouncedSearch, categoryFilter, stockFilter);
  };


  // Server-side filtered products are stored directly in `products`.
  const filteredProducts = products;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map((p) => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter((id) => id !== productId));
    }
  };

  const handleUpdateStock = async () => {
    if (!editStockProduct) return;
    if (!Number.isInteger(newStockValue) || newStockValue < 0) {
      toast.error("Stock quantity must be a whole number of 0 or more");
      return;
    }
    setIsUpdatingStock(true);
    try {
      await updateProductStock(editStockProduct, newStockValue);
      toast.success("Stock updated successfully");
      setEditStockProduct(null);
      setNewStockValue(0);
    } catch (err: any) {
      toast.error(err.message || "Failed to update stock");
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const handleBulkStockUpdate = async (nextStock: number) => {
    const productIds = [...selectedProducts];
    let failures = 0;

    for (const productId of productIds) {
      try {
        await updateProductStock(productId, nextStock);
      } catch {
        failures += 1;
      }
    }

    setSelectedProducts([]);
    if (failures > 0) {
      toast.error(`${failures} stock update${failures === 1 ? "" : "s"} failed`);
    } else if (productIds.length > 0) {
      toast.success("Stock updated successfully");
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    await deleteProduct(productToDelete.id);
    setProductToDelete(null);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadProducts(productsPage, 50, debouncedSearch, categoryFilter, stockFilter);
      // Same as above — use admin endpoint for real Category DB IDs.
      // Also refresh fabric types so newly-created entries appear immediately.
      const ftRes = await adminFetch("/api/admin/fabric-types?active=true");
      const ftData = await ftRes.json().catch(() => null);
      if (!ftRes.ok || !Array.isArray(ftData)) {
        throw new Error(ftData?.error || "Failed to load fabric types");
      }
      setFabricTypes(ftData);

      const catRes = await adminFetch("/api/admin/categories");
      const catData = await catRes.json().catch(() => null);
      if (!catRes.ok || !Array.isArray(catData)) {
        throw new Error(catData?.error || "Failed to load categories");
      }
      setCategories(catData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to refresh products");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDuplicateProduct = async (product: AdminProduct) => {
    try {
      const suffix = Date.now().toString(36).toUpperCase().slice(-6);
      await addProduct({
        ...product,
        id: `prod-${Date.now()}`,
        name: `Copy of ${product.name}`,
        sku: `${product.sku}-${suffix}`,
        // BUG FIX: badge from list is mixed-case (e.g. "New") but the API Zod
        // schema only accepts uppercase ("NEW"). The store also does toUpperCase()
        // but the network payload was already serialised before that ran.
        badge: product.badge?.toUpperCase() as AdminProduct["badge"],
        categoryId: product.categoryId || categories[0]?.id || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success("Product duplicated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate product");
    }
  };

  const handleUploadImage = async (file: File) => {
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("resourceType", "image");

    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        console.error("Upload error response:", data);
        throw new Error(data.error || "Upload failed");
      }

      setProductForm((prev) => ({
        ...prev,
        images: [...prev.images, data.url],
      }));
      setFieldErrors((current) => {
        if (!current.images) return current;
        const next = { ...current };
        delete next.images;
        return next;
      });
      toast.success("Image uploaded");
    } catch (err: any) {
      console.error("Image upload error:", err);
      toast.error(err.message || "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUploadVideo = async (file: File) => {
    setUploadingVideo(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("resourceType", "video");

    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setProductForm((prev) => ({ ...prev, videoUrl: data.url }));
      toast.success("Video uploaded");
    } catch (err: any) {
      toast.error(err.message || "Video upload failed");
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setProductForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleAddTag = (tag: string) => {
    const clean = tag.trim();
    if (!clean) return;
    setProductForm((prev) => ({
      ...prev,
      tags: [...new Set([...prev.tags, clean])],
    }));
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setProductForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const openEditDialog = (product: AdminProduct) => {
    setFieldErrors({});
    setProductForm({ ...product });
    setIsEditProductOpen(true);
  };

  const openAddDialog = () => {
    const base = emptyProduct();
    if (categories.length > 0) {
      base.categoryId = categories[0].id;
    }
    if (fabricTypes.length > 0) {
      base.fabricType = fabricTypes[0].name;
    }
    setFieldErrors({});
    setProductForm(base);
    setTagInput("");
    setIsAddProductOpen(true);
  };

  const handleSaveProduct = async () => {
    if (uploadingImage) {
      toast.error("Please wait for the image to finish uploading");
      return;
    }

    const resolvedCategoryId = productForm.categoryId || categories[0]?.id || "";
    const errors: ProductFormErrors = {};
    if (!productForm.name.trim()) errors.name = "Product name is required";
    if (!productForm.sku.trim()) errors.sku = "Product code (SKU) is required";
    if (!Number.isFinite(productForm.price) || productForm.price <= 0) {
      errors.price = "Price must be greater than 0";
    }
    if (productForm.originalPrice !== undefined && productForm.originalPrice <= 0) {
      errors.originalPrice = "Original price must be greater than 0";
    }
    if (!resolvedCategoryId) errors.categoryId = "Please select a category";
    if (!productForm.fabricType.trim()) errors.fabricType = "Please select a fabric type";
    if (!productForm.color.trim()) errors.color = "Color name is required";
    if (!/^#[0-9a-f]{6}$/i.test(productForm.colorHex)) {
      errors.colorHex = "Enter a valid 6-digit color hex value";
    }
    if (!productForm.description.trim()) errors.description = "Short description is required";
    if (productForm.images.length === 0) errors.images = "Upload at least one product image";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstField = Object.keys(errors)[0] as keyof AdminProduct;
      document.getElementById(firstField)?.focus();
      toast.error(errors[firstField] || "Please complete the required fields");
      return;
    }
    setFieldErrors({});

    setIsSaving(true);
    // BUG FIX: previous code did { ...productForm, ...payload } which double-
    // spread the same object and could cause badge to be sent as mixed-case
    // (e.g. "New") when the store also calls toUpperCase() independently.
    const payload = {
      ...productForm,
      badge: productForm.badge?.toUpperCase(),
      categoryId: resolvedCategoryId,
    };

    try {
      if (isEditProductOpen) {
        await updateProduct(productForm.id, payload);
        toast.success("Product updated successfully!");
        setIsEditProductOpen(false);
      } else {
        await addProduct(payload as AdminProduct);
        toast.success("Product added successfully!");
        setIsAddProductOpen(false);
      }
      setProductForm(emptyProduct());
    } catch (err: any) {
      toast.error(err.message || "Failed to save product");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportProducts = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Product ID,Name,Code,Category,Price,Stock Quantity"]
        .concat(
          filteredProducts.map(
            (p) =>
              `${p.id},"${p.name}","${p.sku}","${p.fabricType}",${p.price},${p.stockQuantity}`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "products_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const lowStockCount = products.filter(
    (p) => p.stockQuantity <= p.lowStockThreshold && p.stockQuantity > 0
  ).length;
  const outOfStockCount = products.filter((p) => p.stockQuantity === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-muted-foreground">
            Manage your product inventory and catalog
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportProducts}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card onClick={() => setStockFilter("all")} className="cursor-pointer border-transparent hover:border-border transition-colors">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{products.length}</p>
            <p className="text-sm text-muted-foreground">Total Products</p>
          </CardContent>
        </Card>
        <Card onClick={() => setStockFilter("in-stock")} className="cursor-pointer border-transparent hover:border-emerald-500/50 transition-colors">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {products.filter((p) => p.stockQuantity > p.lowStockThreshold).length}
            </p>
            <p className="text-sm text-muted-foreground">In Stock</p>
          </CardContent>
        </Card>
        <Card
          className={cn(lowStockCount > 0 && "border-yellow-500")}
          onClick={() => setStockFilter("low-stock")}
        >
          <CardContent className="p-4 text-center cursor-pointer">
            <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
            <p className="text-sm text-muted-foreground">Low Stock</p>
          </CardContent>
        </Card>
        <Card
          className={cn(outOfStockCount > 0 && "border-red-500")}
          onClick={() => setStockFilter("out-of-stock")}
        >
          <CardContent className="p-4 text-center cursor-pointer">
            <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
            <p className="text-sm text-muted-foreground">Out of Stock</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {fabricTypes.map((fabricType) => (
                  <SelectItem key={fabricType.id} value={fabricType.name}>
                    {fabricType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {selectedProducts.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
              <p className="text-sm font-medium">
                {selectedProducts.length} product(s) selected
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStockUpdate(0)}
                >
                  Mark Out of Stock
                </Button>
                <Button size="sm" onClick={() => handleBulkStockUpdate(60)}>
                  Set Stock to 60
                </Button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 w-12">
                    <Checkbox
                      checked={
                        selectedProducts.length === filteredProducts.length &&
                        filteredProducts.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left p-4 text-sm font-medium">Product</th>
                  <th className="text-left p-4 text-sm font-medium hidden sm:table-cell">Code</th>
                  <th className="text-left p-4 text-sm font-medium hidden sm:table-cell">Category</th>
                  <th className="text-left p-4 text-sm font-medium">Price</th>
                  <th className="text-left p-4 text-sm font-medium">Stock</th>
                  <th className="text-left p-4 text-sm font-medium hidden sm:table-cell">Badge</th>
                  <th className="text-left p-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const isLowStock =
                    product.stockQuantity <= product.lowStockThreshold &&
                    product.stockQuantity > 0;
                  const isOutOfStock = product.stockQuantity === 0;

                  return (
                    <tr key={product.id} className="border-t hover:bg-muted/30">
                      <td className="p-4">
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) =>
                            handleSelectProduct(product.id, checked as boolean)
                          }
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 rounded overflow-hidden bg-muted">
                            <Image
                              src={getProductImage(product.images)}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-xs">
                              {product.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {product.color}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-sm hidden sm:table-cell">{product.sku}</td>
                      <td className="p-4 text-sm hidden sm:table-cell">{product.fabricType}</td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{formatPrice(product.price)}</p>
                          {product.originalPrice && (
                            <p className="text-sm text-muted-foreground line-through">
                              {formatPrice(product.originalPrice)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "font-medium",
                                isOutOfStock && "text-red-600",
                                isLowStock && "text-yellow-600"
                              )}
                            >
                              {product.stockQuantity}
                            </span>
                            {isLowStock && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <Progress
                            value={Math.min(
                              (product.stockQuantity / 50) * 100,
                              100
                            )}
                            className={cn(
                              "h-1.5 w-20",
                              isOutOfStock && "[&>div]:bg-red-500",
                              isLowStock && "[&>div]:bg-yellow-500"
                            )}
                          />
                        </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        {product.badge && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              badgeColors[product.badge as keyof typeof badgeColors]
                            )}
                          >
                            {product.badge}
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/product/${product.id}`} target="_blank">
                                <Eye className="h-4 w-4 mr-2" />
                                View on Store
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(product)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Product
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditStockProduct(product.id);
                                setNewStockValue(product.stockQuantity);
                              }}
                            >
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Update Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateProduct(product)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => setProductToDelete(product)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No products found</p>
            </div>
          )}

          {productsTotalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing page {productsPage} of {productsTotalPages} ({productsTotal} total)
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

      {/* Update Stock Dialog */}
      <Dialog
        open={!!editStockProduct}
        onOpenChange={() => setEditStockProduct(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
            <DialogDescription>
              Enter the new stock quantity for this product.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="stock">Stock Quantity</Label>
            <Input
              id="stock"
              type="number"
              min="0"
              step="1"
              value={newStockValue}
              onChange={(e) => setNewStockValue(parseInt(e.target.value) || 0)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStockProduct(null)} disabled={isUpdatingStock}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStock} disabled={isUpdatingStock}>
              {isUpdatingStock && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!productToDelete}
        onOpenChange={(open) => { if (!open) setProductToDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{productToDelete?.name}</strong>? This action cannot be
              undone. The product will be marked as out of stock and hidden
              from the store.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add / Edit Product Dialog */}
      <ProductDialog
        open={isAddProductOpen || isEditProductOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddProductOpen(false);
            setIsEditProductOpen(false);
            setFieldErrors({});
          }
        }}
        isEdit={isEditProductOpen}
        product={productForm}
        setProduct={setProductForm}
        categories={categories}
        fabricTypes={fabricTypes}
        isLoadingCategories={isLoadingCategories}
        uploadingImage={uploadingImage}
        uploadingVideo={uploadingVideo}
        tagInput={tagInput}
        setTagInput={setTagInput}
        onUploadImage={handleUploadImage}
        onUploadVideo={handleUploadVideo}
        onRemoveImage={handleRemoveImage}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        onSave={handleSaveProduct}
        isSaving={isSaving}
        fieldErrors={fieldErrors}
        clearFieldError={(field) => {
          setFieldErrors((current) => {
            if (!current[field]) return current;
            const next = { ...current };
            delete next[field];
            return next;
          });
        }}
      />
    </div>
  );
}

/* ── Product Form Dialog ─────────────────────────────────────────── */

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEdit: boolean;
  product: AdminProduct;
  setProduct: (p: AdminProduct | ((prev: AdminProduct) => AdminProduct)) => void;
  categories: { id: string; name: string }[];
  fabricTypes: { id: string; name: string; isActive: boolean }[];
  isLoadingCategories: boolean;
  uploadingImage: boolean;
  uploadingVideo: boolean;
  tagInput: string;
  setTagInput: (v: string) => void;
  onUploadImage: (file: File) => void;
  onUploadVideo: (file: File) => void;
  onRemoveImage: (index: number) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onSave: () => void;
  isSaving: boolean;
  fieldErrors: ProductFormErrors;
  clearFieldError: (field: keyof AdminProduct) => void;
}

function ProductDialog({
  open,
  onOpenChange,
  isEdit,
  product,
  setProduct,
  categories,
  fabricTypes,
  isLoadingCategories,
  uploadingImage,
  uploadingVideo,
  tagInput,
  setTagInput,
  onUploadImage,
  onUploadVideo,
  onRemoveImage,
  onAddTag,
  onRemoveTag,
  onSave,
  isSaving,
  fieldErrors,
  clearFieldError,
}: ProductDialogProps) {
  const update = (field: keyof AdminProduct, value: any) => {
    clearFieldError(field);
    setProduct((prev) => ({ ...prev, [field]: value }));
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Product" : "Add New Product"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Make changes to your product here."
              : "Create a new product by filling in the details below."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={product.name}
                onChange={(e) => update("name", e.target.value)}
                aria-invalid={!!fieldErrors.name}
              />
              <ProductFieldError message={fieldErrors.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">Code *</Label>
              <Input
                id="sku"
                value={product.sku}
                onChange={(e) => update("sku", e.target.value)}
                aria-invalid={!!fieldErrors.sku}
              />
              <ProductFieldError message={fieldErrors.sku} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (PKR) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                value={product.price}
                onChange={(e) => update("price", parseFloat(e.target.value) || 0)}
                aria-invalid={!!fieldErrors.price}
              />
              <ProductFieldError message={fieldErrors.price} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="originalPrice">Original Price (PKR)</Label>
              <Input
                id="originalPrice"
                type="number"
                min="0"
                value={product.originalPrice || ""}
                onChange={(e) =>
                  update(
                    "originalPrice",
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
                aria-invalid={!!fieldErrors.originalPrice}
              />
              <ProductFieldError message={fieldErrors.originalPrice} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={product.categoryId}
                onValueChange={(v) => update("categoryId", v)}
              >
                <SelectTrigger id="categoryId" aria-invalid={!!fieldErrors.categoryId}>
                  {isLoadingCategories ? (
                    <span className="text-muted-foreground text-sm">Loading…</span>
                  ) : (
                    <SelectValue placeholder="Select category" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ProductFieldError message={fieldErrors.categoryId} />
            </div>
            <div className="space-y-2">
              <Label>Fabric Type *</Label>
              <Select
                value={product.fabricType}
                onValueChange={(v) => update("fabricType", v)}
              >
                <SelectTrigger id="fabricType" aria-invalid={!!fieldErrors.fabricType}>
                  {isLoadingCategories ? (
                    <span className="text-muted-foreground text-sm">Loading…</span>
                  ) : (
                    <SelectValue placeholder="Select fabric type" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {fabricTypes.map((ft) => (
                    <SelectItem key={ft.id} value={ft.name}>
                      {ft.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ProductFieldError message={fieldErrors.fabricType} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Badge</Label>
              <Select
                value={product.badge || "none"}
                onValueChange={(v) => update("badge", v === "none" ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No badge" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No badge</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Trending">Trending</SelectItem>
                  <SelectItem value="Hot">Hot</SelectItem>
                  <SelectItem value="Limited">Limited</SelectItem>
                  <SelectItem value="Featured">Featured</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">Color Name *</Label>
              <Input
                id="color"
                value={product.color}
                onChange={(e) => update("color", e.target.value)}
                placeholder="e.g. Royal Blue"
                aria-invalid={!!fieldErrors.color}
              />
              <ProductFieldError message={fieldErrors.color} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="colorHex">Color Hex *</Label>
              <div className="flex gap-2">
                <Input
                  id="colorHex"
                  value={product.colorHex}
                  onChange={(e) => update("colorHex", e.target.value)}
                  placeholder="#000000"
                  aria-invalid={!!fieldErrors.colorHex}
                />
                <input
                  type="color"
                  value={product.colorHex}
                  onChange={(e) => update("colorHex", e.target.value)}
                  className="h-10 w-10 rounded border p-0.5 cursor-pointer"
                />
              </div>
              <ProductFieldError message={fieldErrors.colorHex} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Short Description *</Label>
            <Input
              id="description"
              value={product.description}
              onChange={(e) => update("description", e.target.value)}
              aria-invalid={!!fieldErrors.description}
            />
            <ProductFieldError message={fieldErrors.description} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="longDescription">Long Description</Label>
            <Textarea
              id="longDescription"
              value={product.longDescription}
              onChange={(e) => update("longDescription", e.target.value)}
              rows={3}
            />
          </div>

          {/* Images */}
          <div className="space-y-2" id="images" tabIndex={-1}>
            <Label>Product Images</Label>
            <div className="flex flex-wrap gap-3">
              {product.images.map((img, i) => (
                <div key={`${img}-${i}`} className="relative group">
                  <div className="h-20 w-20 rounded border overflow-hidden bg-muted">
                    <Image
                      src={img}
                      alt={`Product image ${i + 1}`}
                      width={80}
                      height={80}
                      className="object-cover h-full w-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveImage(i)}
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {product.images.length < 3 && (
                <>
                  <label
                    htmlFor="product-image-upload"
                    className={cn(
                      "h-20 w-20 rounded border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-accent hover:text-accent transition-colors",
                      uploadingImage ? "opacity-50 pointer-events-none" : "cursor-pointer"
                    )}
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <ImageIcon className="h-5 w-5 mb-1" />
                        <span className="text-[10px]">Add Image</span>
                      </>
                    )}
                  </label>
                  <input
                    id="product-image-upload"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={uploadingImage}
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        const remainingSlots = 3 - product.images.length;
                        const filesToUpload = files.slice(0, remainingSlots);
                        for (const file of filesToUpload) {
                          await onUploadImage(file);
                        }
                      }
                      e.target.value = "";
                    }}
                  />
                </>
              )}
            </div>
            <ProductFieldError message={fieldErrors.images} />
          </div>

          {/* Video */}
          <div className="space-y-2">
            <Label>Product Video</Label>
            <div className="flex items-center gap-3">
              {product.videoUrl ? (
                <div className="relative group">
                  <video
                    src={product.videoUrl}
                    className="h-20 w-36 rounded border bg-muted object-cover"
                    muted
                  />
                  <button
                    type="button"
                    onClick={() => update("videoUrl", undefined)}
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="product-video-upload"
                  className={cn(
                    "h-20 w-36 rounded border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-accent hover:text-accent transition-colors",
                    uploadingVideo ? "opacity-50 pointer-events-none" : "cursor-pointer"
                  )}
                >
                  {uploadingVideo ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Video className="h-5 w-5 mb-1" />
                      <span className="text-[10px]">Upload Video</span>
                    </>
                  )}
                </label>
              )}
              <input
                id="product-video-upload"
                type="file"
                accept="video/mp4,video/webm"
                className="sr-only"
                disabled={uploadingVideo}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadVideo(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {product.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button onClick={() => onRemoveTag(tag)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Type a tag and press Enter..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddTag(tagInput);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => onAddTag(tagInput)}
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {PREDEFINED_TAGS.map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => onAddTag(t)}
                >
                  + {t}
                </Badge>
              ))}
            </div>
          </div>

          {/* SEO */}
          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <Input
              id="slug"
              value={product.slug}
              onChange={(e) => update("slug", e.target.value)}
              placeholder="e.g. premium-cotton-collection"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="metaTitle">Meta Title</Label>
            <Input
              id="metaTitle"
              value={product.metaTitle || ""}
              onChange={(e) => update("metaTitle", e.target.value)}
              placeholder="SEO title for search engines"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="metaDescription">Meta Description</Label>
            <Textarea
              id="metaDescription"
              value={product.metaDescription || ""}
              onChange={(e) => update("metaDescription", e.target.value)}
              placeholder="SEO description for search engines"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving || uploadingImage || uploadingVideo}
          >
            {(isSaving || uploadingImage || uploadingVideo) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {uploadingImage || uploadingVideo ? "Uploading..." : isEdit ? "Save Changes" : "Add Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

