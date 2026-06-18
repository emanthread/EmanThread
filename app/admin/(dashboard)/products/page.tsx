"use client";

import { useState, useEffect, useMemo } from "react";
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

function emptyProduct(): AdminProduct {
  return {
    id: "",
    name: "",
    sku: "",
    slug: "",
    price: 0,
    originalPrice: undefined,
    fabricType: "Cotton",
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
  const { products, updateProductStock, addProduct, updateProduct, loadProducts, deleteProduct } = useAdminStore();

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [fabricTypes, setFabricTypes] = useState<{ id: string; name: string; isActive: boolean }[]>([]);

  useEffect(() => {
    loadProducts();
    setIsLoadingCategories(true);
    // Use /api/admin/categories (not /api/categories) so we always get real
    // Category DB IDs. The public endpoint returns fabricType-grouped data
    // for shop filtering and must never be used as a categoryId source.
    // Also fetch fabric types so newly-created entries appear in the dropdown.
    Promise.all([
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/fabric-types").then((r) => r.json()),
    ])
      .then(([catData, ftData]) => {
        setCategories(catData || []);
        setFabricTypes(Array.isArray(ftData) ? ftData : []);
      })
      .catch(() => toast.error("Failed to load categories"))
      .finally(() => setIsLoadingCategories(false));
  }, [loadProducts]);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [editStockProduct, setEditStockProduct] = useState<string | null>(null);
  const [newStockValue, setNewStockValue] = useState<number>(0);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [productForm, setProductForm] = useState<AdminProduct>(emptyProduct());
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [productToDelete, setProductToDelete] = useState<AdminProduct | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tagInput, setTagInput] = useState("");


  // Merge Category names + active FabricType names, deduplicated by lowercase name.
  // Categories come first so their IDs are preserved for categoryId assignment.
  // Active FabricType entries that don't already exist in categories are appended.
  const fabricOptions = useMemo(() => {
    const seen = new Set<string>();
    const merged: { id: string; name: string }[] = [];
    for (const c of categories) {
      const key = c.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({ id: c.id, name: c.name });
      }
    }
    for (const ft of fabricTypes) {
      const key = ft.name.toLowerCase();
      if (ft.isActive && !seen.has(key)) {
        seen.add(key);
        merged.push({ id: ft.id, name: ft.name });
      }
    }
    return merged;
  }, [categories, fabricTypes]);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" ||
      product.fabricType.toLowerCase().replace(" & ", "-").replace(" ", "-") ===
        categoryFilter;
    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "low-stock" &&
        product.stockQuantity <= product.lowStockThreshold) ||
      (stockFilter === "in-stock" &&
        product.stockQuantity > product.lowStockThreshold) ||
      (stockFilter === "out-of-stock" && product.stockQuantity === 0);
    return matchesSearch && matchesCategory && matchesStock;
  });

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
    try {
      await updateProductStock(editStockProduct, newStockValue);
      toast.success("Stock updated successfully");
      setEditStockProduct(null);
      setNewStockValue(0);
    } catch (err: any) {
      toast.error(err.message || "Failed to update stock");
    }
  };

  const handleBulkStockUpdate = (nextStock: number) => {
    selectedProducts.forEach((productId) => updateProductStock(productId, nextStock));
    setSelectedProducts([]);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    await deleteProduct(productToDelete.id);
    setProductToDelete(null);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadProducts();
      // Same as above — use admin endpoint for real Category DB IDs.
      // Also refresh fabric types so newly-created entries appear immediately.
      const [catRes, ftRes] = await Promise.all([
        fetch("/api/admin/categories"),
        fetch("/api/admin/fabric-types"),
      ]);
      const [catData, ftData] = await Promise.all([catRes.json(), ftRes.json()]);
      if (catData) setCategories(catData);
      if (Array.isArray(ftData)) setFabricTypes(ftData);
    } catch {
      // Silently fail — individual handlers show toasts if needed
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
    setProductForm({ ...product });
    setIsEditProductOpen(true);
  };

  const openAddDialog = () => {
    setProductForm(emptyProduct());
    setTagInput("");
    setIsAddProductOpen(true);
  };

  const handleSaveProduct = async () => {
    const payload = {
      ...productForm,
      badge: productForm.badge?.toUpperCase(),
      images: productForm.images.length > 0 ? productForm.images : ["/placeholder.jpg"],
      categoryId: productForm.categoryId || categories[0]?.id || "",
    };

    try {
      if (isEditProductOpen) {
        await updateProduct(productForm.id, payload);
        toast.success("Product updated successfully!");
        setIsEditProductOpen(false);
      } else {
        await addProduct({ ...productForm, ...payload } as AdminProduct);
        toast.success("Product added successfully!");
        setIsAddProductOpen(false);
      }
      setProductForm(emptyProduct());
    } catch (err: any) {
      toast.error(err.message || "Failed to save product");
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
                <SelectItem value="cotton">Cotton</SelectItem>
                <SelectItem value="wash-wear">Wash & Wear</SelectItem>
                <SelectItem value="boski">Boski</SelectItem>
                <SelectItem value="wool-blend">Wool Blend</SelectItem>
                <SelectItem value="khaddar">Khaddar</SelectItem>
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
              value={newStockValue}
              onChange={(e) => setNewStockValue(parseInt(e.target.value) || 0)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStockProduct(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStock}>Update Stock</Button>
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
          }
        }}
        isEdit={isEditProductOpen}
        product={productForm}
        setProduct={setProductForm}
        categories={fabricOptions}
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
}

function ProductDialog({
  open,
  onOpenChange,
  isEdit,
  product,
  setProduct,
  categories,
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
}: ProductDialogProps) {
  const update = (field: keyof AdminProduct, value: any) => {
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">Code *</Label>
              <Input
                id="sku"
                value={product.sku}
                onChange={(e) => update("sku", e.target.value)}
              />
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
              />
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
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fabric Type *</Label>
              <Select
                value={product.fabricType}
                onValueChange={(v) => {
                  update("fabricType", v);
                  const selectedCat = categories.find(c => c.name === v);
                  if (selectedCat) update("categoryId", selectedCat.id);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="colorHex">Color Hex *</Label>
              <div className="flex gap-2">
                <Input
                  id="colorHex"
                  value={product.colorHex}
                  onChange={(e) => update("colorHex", e.target.value)}
                  placeholder="#000000"
                />
                <input
                  type="color"
                  value={product.colorHex}
                  onChange={(e) => update("colorHex", e.target.value)}
                  className="h-10 w-10 rounded border p-0.5 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Short Description *</Label>
            <Input
              id="description"
              value={product.description}
              onChange={(e) => update("description", e.target.value)}
            />
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
          <div className="space-y-2">
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
            disabled={!product.name || !product.sku || product.images.length === 0}
          >
            {isEdit ? "Save Changes" : "Add Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

