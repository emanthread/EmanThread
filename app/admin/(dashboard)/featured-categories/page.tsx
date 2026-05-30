"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Plus, Trash2, GripVertical, ExternalLink, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FeaturedCategory {
  id: string; // The URL slug / fabricType matching
  name: string;
  description: string;
  image: string;
  productCount: number;
}

function ImageUploader({
  currentImage,
  onImageChange,
}: {
  currentImage: string;
  onImageChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onImageChange(data.url);
      toast({ title: "Success", description: "Image uploaded" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Image upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>Image</Label>
      <div className="relative h-40 rounded-lg overflow-hidden bg-muted">
        {currentImage ? (
          <Image
            src={currentImage}
            alt="Preview"
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No image selected
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Upload Image
        </Button>
        <Input
          value={currentImage}
          onChange={(e) => onImageChange(e.target.value)}
          placeholder="Or paste image path..."
          className="flex-1 font-mono text-xs"
        />
        <Button
          variant="outline"
          size="icon"
          title="Open in new tab"
          onClick={() => window.open(currentImage, "_blank")}
          disabled={!currentImage}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function CategoryEditor({
  category,
  index,
  onChange,
  onRemove,
}: {
  category: FeaturedCategory;
  index: number;
  onChange: (index: number, category: FeaturedCategory) => void;
  onRemove: (index: number) => void;
}) {
  const update = (field: keyof FeaturedCategory, value: string | number) => {
    onChange(index, { ...category, [field]: value });
  };

  return (
    <Card className="relative">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
          <CardTitle className="text-base">Category {index + 1}</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <ImageUploader
          currentImage={category.image}
          onImageChange={(url) => update("image", url)}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={category.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Cotton"
            />
          </div>
          <div className="space-y-2">
            <Label>Category Slug (ID)</Label>
            <Input
              value={category.id}
              onChange={(e) => update("id", e.target.value)}
              placeholder="e.g. cotton (for shop filters)"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={category.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Breathable comfort for every season..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Manual Product Count (Fallback)</Label>
            <Input
              type="number"
              value={category.productCount}
              onChange={(e) => update("productCount", parseInt(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              If an actual fabric matches the ID, it will override this count automatically.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FeaturedCategoriesPage() {
  const [categories, setCategories] = useState<FeaturedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/featured-categories");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      if (data.categories && data.categories.length > 0) {
        setCategories(data.categories);
      } else {
        // Fallback default state
        setCategories([
          {
            id: "cotton",
            name: "Cotton",
            description: "Breathable comfort for every season",
            image: "/images/fabrics/cat_cotton_1776582727723.png",
            productCount: 0,
          },
          {
            id: "khaddar",
            name: "Khaddar",
            description: "Traditional handwoven excellence",
            image: "/images/fabrics/promo_1776582682565.png",
            productCount: 0,
          },
        ]);
      }
    } catch (err) {
      console.error("Load error:", err);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCategoryChange = (index: number, category: FeaturedCategory) => {
    const updated = [...categories];
    updated[index] = category;
    setCategories(updated);
  };

  const handleRemoveCategory = (index: number) => {
    if (categories.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "You need at least 1 featured category",
        variant: "destructive",
      });
      return;
    }
    setCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCategory = () => {
    setCategories((prev) => [
      ...prev,
      {
        id: "",
        name: "New Category",
        description: "Description",
        image: "",
        productCount: 0,
      },
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/featured-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      toast({
        title: "Saved",
        description: "Featured categories updated successfully",
      });
    } catch (err: any) {
      console.error("Save error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to save",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Featured Categories</h1>
          <p className="text-muted-foreground">
            Manage the categories displayed in the "Shop by Category" section on the home page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleAddCategory}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((category, index) => (
          <CategoryEditor
            key={index}
            category={category}
            index={index}
            onChange={handleCategoryChange}
            onRemove={handleRemoveCategory}
          />
        ))}
      </div>

      {categories.length > 0 && (
        <div className="text-sm text-muted-foreground bg-muted rounded-lg p-4 mt-6">
          <p className="font-medium mb-1">Tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Optimal image ratio is typically 5:4 or 2:1 depending on position in the grid.</li>
            <li>Click <strong>Upload Image</strong> to upload a new image from your computer.</li>
            <li>Make sure the Category Slug matches your actual Fabric Type (e.g. `cotton`, `wash & wear` converted to slug) to link to the shop correctly.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
