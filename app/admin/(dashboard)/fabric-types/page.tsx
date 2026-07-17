"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  MoreHorizontal,
  Layers,
  Tag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FabricType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
  productCount: number;
  isActive: boolean;
}

function emptyFabricForm() {
  return { name: "", slug: "", description: "" };
}

function emptyCategoryForm() {
  return { name: "", description: "", image: "" };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function readApiError(res: Response, fallback: string) {
  const data = await res.json().catch(() => null);
  return data?.error || fallback;
}

export default function AdminFabricTypesPage() {
  const [activeTab, setActiveTab] = useState("fabric-types");

  const [fabricTypes, setFabricTypes] = useState<FabricType[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyFabricForm());
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm());
  const [categorySaving, setCategorySaving] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [deletingCategoryName, setDeletingCategoryName] = useState("");
  const [deletingCategoryProductCount, setDeletingCategoryProductCount] = useState(0);

  const fetchFabricTypes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/fabric-types");
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to load fabric types"));
      }
      const data = await res.json();
      setFabricTypes(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load fabric types");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const res = await fetch("/api/admin/categories");
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to load categories"));
      }
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    void fetchFabricTypes();
    void fetchCategories();
  }, []);

  const filtered = fabricTypes.filter((ft) => {
    if (statusFilter === "active") return ft.isActive;
    if (statusFilter === "inactive") return !ft.isActive;
    return true;
  });

  const openAddDialog = () => {
    setEditingId(null);
    setForm(emptyFabricForm());
    setShowDialog(true);
  };

  const openEditDialog = (ft: FabricType) => {
    setEditingId(ft.id);
    setForm({
      name: ft.name,
      slug: ft.slug,
      description: ft.description || "",
    });
    setShowDialog(true);
  };

  const openAddCategoryDialog = () => {
    setEditingCategoryId(null);
    setCategoryForm(emptyCategoryForm());
    setShowCategoryDialog(true);
  };

  const openEditCategoryDialog = (category: Category) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      image: category.image || "",
    });
    setShowCategoryDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/fabric-types/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error(await readApiError(res, "Failed to update"));
        toast.success("Fabric type updated");
      } else {
        const res = await fetch("/api/admin/fabric-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error(await readApiError(res, "Failed to create"));
        toast.success("Fabric type created");
      }
      setShowDialog(false);
      setForm(emptyFabricForm());
      await fetchFabricTypes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save fabric type");
    } finally {
      setSaving(false);
    }
  };

  const handleCategorySave = async () => {
    if (!categoryForm.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setCategorySaving(true);
    try {
      if (editingCategoryId) {
        const res = await fetch(`/api/admin/categories/${editingCategoryId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(categoryForm),
        });
        if (!res.ok) throw new Error(await readApiError(res, "Failed to update category"));
        toast.success("Category updated");
      } else {
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(categoryForm),
        });
        if (!res.ok) throw new Error(await readApiError(res, "Failed to create category"));
        toast.success("Category created");
      }
      setShowCategoryDialog(false);
      setCategoryForm(emptyCategoryForm());
      await fetchCategories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/admin/fabric-types/${deletingId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to delete"));
      toast.success("Fabric type deleted");
      setDeletingId(null);
      await fetchFabricTypes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete fabric type");
    }
  };

  const handleCategoryDelete = async () => {
    if (!deletingCategoryId) return;
    try {
      const res = await fetch(`/api/admin/categories/${deletingCategoryId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to delete category"));
      toast.success("Category deleted");
      setDeletingCategoryId(null);
      setDeletingCategoryProductCount(0);
      await fetchCategories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete category");
    }
  };

  const handleToggleActive = async (ft: FabricType) => {
    try {
      const res = await fetch(`/api/admin/fabric-types/${ft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !ft.isActive }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to toggle"));
      toast.success(ft.isActive ? "Fabric type deactivated" : "Fabric type activated");
      await fetchFabricTypes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle fabric type");
    }
  };

  const isFabricTab = activeTab === "fabric-types";
  const currentLoading = isFabricTab ? loading : categoriesLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Product Taxonomy</h1>
          <p className="text-muted-foreground">
            Manage fabric types and categories used in the admin product form
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={isFabricTab ? fetchFabricTypes : fetchCategories}
            disabled={currentLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", currentLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={isFabricTab ? openAddDialog : openAddCategoryDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {isFabricTab ? "Add Fabric Type" : "Add Category"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="fabric-types" className="gap-2">
            <Layers className="h-4 w-4" />
            Fabric Types
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="h-4 w-4" />
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fabric-types" className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Layers className="h-5 w-5 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {filtered.length} fabric type(s)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium">Name</th>
                      <th className="text-left p-4 text-sm font-medium hidden sm:table-cell">Slug</th>
                      <th className="text-left p-4 text-sm font-medium hidden md:table-cell">Description</th>
                      <th className="text-left p-4 text-sm font-medium">Status</th>
                      <th className="text-left p-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((ft) => (
                      <tr key={ft.id} className="border-t hover:bg-muted/30">
                        <td className="p-4 font-medium">{ft.name}</td>
                        <td className="p-4 text-sm text-muted-foreground hidden sm:table-cell font-mono">
                          {ft.slug}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground hidden md:table-cell max-w-xs truncate">
                          {ft.description || "-"}
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={ft.isActive ? "default" : "secondary"}
                            className={cn(
                              ft.isActive && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                            )}
                          >
                            {ft.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(ft)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(ft)}>
                                <Layers className="h-4 w-4 mr-2" />
                                {ft.isActive ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setDeletingId(ft.id);
                                  setDeletingName(ft.name);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-muted-foreground">
                          {loading ? "Loading..." : "No fabric types found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-5 w-5 text-muted-foreground" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {categories.length} category(s). Categories with assigned products cannot be deleted.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium">Name</th>
                      <th className="text-left p-4 text-sm font-medium hidden md:table-cell">Description</th>
                      <th className="text-left p-4 text-sm font-medium hidden lg:table-cell">Image</th>
                      <th className="text-left p-4 text-sm font-medium">Products</th>
                      <th className="text-left p-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category.id} className="border-t hover:bg-muted/30">
                        <td className="p-4 font-medium">{category.name}</td>
                        <td className="p-4 text-sm text-muted-foreground hidden md:table-cell max-w-xs truncate">
                          {category.description || "-"}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground hidden lg:table-cell max-w-xs truncate">
                          {category.image || "-"}
                        </td>
                        <td className="p-4">
                          <Badge variant={category.productCount > 0 ? "default" : "secondary"}>
                            {category.productCount}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditCategoryDialog(category)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className={cn(
                                  "text-red-600",
                                  category.productCount > 0 && "text-muted-foreground"
                                )}
                                disabled={category.productCount > 0}
                                onClick={() => {
                                  setDeletingCategoryId(category.id);
                                  setDeletingCategoryName(category.name);
                                  setDeletingCategoryProductCount(category.productCount);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {category.productCount > 0 ? "In use" : "Delete"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                    {categories.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-muted-foreground">
                          {categoriesLoading ? "Loading..." : "No categories found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Fabric Type" : "Add Fabric Type"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the fabric type details below."
                : "Create a new fabric type that will appear in the product form."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ft-name">Name *</Label>
              <Input
                id="ft-name"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    name,
                    slug: editingId ? prev.slug : slugify(name),
                  }));
                }}
                placeholder="e.g. Linen"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ft-slug">Slug *</Label>
              <Input
                id="ft-slug"
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="e.g. linen"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ft-desc">Description</Label>
              <Textarea
                id="ft-desc"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description of this fabric type"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Fabric Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategoryId ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>
              {editingCategoryId
                ? "Update the category details below."
                : "Create a category that admins can select while adding products."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name *</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Boski"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Optional category description"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-image">Image URL</Label>
              <Input
                id="category-image"
                value={categoryForm.image}
                onChange={(e) =>
                  setCategoryForm((prev) => ({ ...prev, image: e.target.value }))
                }
                placeholder="Optional image URL"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCategorySave} disabled={categorySaving}>
              {categorySaving ? "Saving..." : editingCategoryId ? "Save Changes" : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fabric Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletingCategoryId}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingCategoryId(null);
            setDeletingCategoryProductCount(0);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingCategoryName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCategoryDelete}
              disabled={deletingCategoryProductCount > 0}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
