"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  MoreHorizontal,
  Layers,
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

function emptyForm() {
  return { name: "", slug: "", description: "" };
}

export default function AdminFabricTypesPage() {
  const [fabricTypes, setFabricTypes] = useState<FabricType[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Add/Edit state
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");

  const fetchFabricTypes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/fabric-types");
      const data = await res.json();
      setFabricTypes(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load fabric types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFabricTypes();
  }, []);

  const filtered = fabricTypes.filter((ft) => {
    if (statusFilter === "active") return ft.isActive;
    if (statusFilter === "inactive") return !ft.isActive;
    return true;
  });

  const openAddDialog = () => {
    setEditingId(null);
    setForm(emptyForm());
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
        if (!res.ok) throw new Error("Failed to update");
        toast.success("Fabric type updated");
      } else {
        const res = await fetch("/api/admin/fabric-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Failed to create");
        toast.success("Fabric type created");
      }
      setShowDialog(false);
      setForm(emptyForm());
      await fetchFabricTypes();
    } catch (err: any) {
      toast.error(err.message || "Failed to save fabric type");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/admin/fabric-types/${deletingId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Fabric type deleted");
      setDeletingId(null);
      await fetchFabricTypes();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete fabric type");
    }
  };

  const handleToggleActive = async (ft: FabricType) => {
    try {
      const res = await fetch(`/api/admin/fabric-types/${ft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !ft.isActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      toast.success(ft.isActive ? "Fabric type deactivated" : "Fabric type activated");
      await fetchFabricTypes();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle fabric type");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Fabric Types</h1>
          <p className="text-muted-foreground">
            Manage the fabric types available for products
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchFabricTypes}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Fabric Type
          </Button>
        </div>
      </div>

      {/* Status filter */}
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

      {/* Table */}
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
                      {ft.description || "—"}
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

      {/* Add/Edit Dialog */}
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
                    slug: editingId ? prev.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fabric Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deletingName}</strong>? This action cannot be undone.
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
    </div>
  );
}