"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Search, Tag, X, RefreshCw, Image as ImageIcon, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ProductImage {
  url: string;
  productId: string;
  productName: string;
  tags: string[];
  isVideo: boolean;
}

const PREDEFINED_TAGS = ["Summer", "Winter", "All Season", "Cotton", "Linen", "Silk", "Wool", "Festive", "Casual", "Formal", "Wedding", "Eid", "Premium", "Budget", "Front View", "Back View", "Side View", "Detail"];

export default function MediaLibraryPage() {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTag, setSearchTag] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products?limit=100");
      if (!res.ok) return;
      const products = await res.json();
      
      const extracted: ProductImage[] = [];
      for (const p of products) {
        const tags = p.tags || [];
        for (const url of p.images) {
          extracted.push({ url, productId: p.id, productName: p.name, tags, isVideo: false });
        }
        if (p.videoUrl) {
          extracted.push({ url: p.videoUrl, productId: p.id, productName: p.name, tags, isVideo: true });
        }
      }
      setImages(extracted);
    } catch (err) {
      console.error("Failed to load images:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const filteredImages = images.filter((img) => {
    if (activeFilter !== "all") {
      if (activeFilter === "video") return img.isVideo;
      return img.tags.includes(activeFilter);
    }
    if (searchTag.trim()) {
      return img.tags.some((t) => t.toLowerCase().includes(searchTag.toLowerCase()));
    }
    return true;
  });

  const uniqueTags = [...new Set(images.flatMap((img) => img.tags))].sort();

  const handleSaveTags = async (productId: string) => {
    setSaving(true);
    try {
      await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: editTags }),
      });
      setImages((prev) =>
        prev.map((img) =>
          img.productId === productId ? { ...img, tags: editTags } : img
        )
      );
      setEditingImage(null);
    } catch {
      alert("Failed to save tags");
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !editTags.includes(t)) {
      setEditTags([...editTags, t]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setEditTags(editTags.filter((t) => t !== tag));
  };

  const handleDeleteImage = async (productId: string, imageUrl: string) => {
    if (!confirm('Delete this image? This cannot be undone.')) return;
    try {
      // Fetch current product to get its image list
      const productRes = await fetch(`/api/products/${productId}`);
      if (!productRes.ok) { alert('Failed to fetch product'); return; }
      const product = await productRes.json();

      // Remove the image URL from the images array
      const updatedImages = product.images.filter((url: string) => url !== imageUrl);
      const isVideo = imageUrl === product.videoUrl;

      // Update the product
      const updateRes = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: updatedImages,
          videoUrl: isVideo ? undefined : product.videoUrl,
        }),
      });

      if (updateRes.ok) {
        // Also delete from Cloudinary if we can extract the publicId
        try {
          // Cloudinary URLs look like: .../image/upload/v1234/public_id.ext
          // or: .../raw/upload/v1234/public_id
          const urlParts = imageUrl.split('/');
          const uploadIndex = urlParts.findIndex(p => p === 'upload');
          if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
            const versionAndId = urlParts.slice(uploadIndex + 1).join('/');
            // Remove version prefix (v12345/) and file extension
            const withoutVersion = versionAndId.replace(/^v\d+\//, '');
            const publicId = withoutVersion.replace(/\.[^.]+$/, '');
            const resourceType = isVideo ? 'video' : 'image';
            // Fire and forget - don't block UI on this
            fetch('/api/admin/media/delete', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ publicId, resourceType }),
            }).catch(() => {});
          }
        } catch {
          // Silently ignore Cloudinary delete failure — the product link is already removed
        }

        setImages((prev) => prev.filter(img => img.url !== imageUrl));
      } else {
        const data = await updateRes.json();
        alert(data.error || 'Failed to delete image');
      }
    } catch {
      alert('Failed to delete image');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Media Library</h1>
          <p className="text-muted-foreground">Browse and tag product images and videos</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchImages} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button variant={activeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setActiveFilter("all")}>All</Button>
          <Button variant={activeFilter === "video" ? "default" : "outline"} size="sm" onClick={() => setActiveFilter("video")}>Videos</Button>
          {uniqueTags.slice(0, 10).map((tag) => (
            <Button key={tag} variant={activeFilter === tag ? "default" : "outline"} size="sm" onClick={() => setActiveFilter(tag)}>
              {tag}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by tag..." value={searchTag} onChange={(e) => setSearchTag(e.target.value)} />
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        {filteredImages.length} of {images.length} media items
        <span className="mx-2">·</span>
        {uniqueTags.length} unique tags
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading media...</p>
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground">
          <ImageIcon className="h-8 w-8 mx-auto mb-4 opacity-50" />
          <p>No media found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredImages.map((img, i) => (
            <Card key={`${img.productId}-${i}`} className="overflow-hidden group">
              <div className="relative aspect-square bg-muted">
                {img.isVideo ? (
                  <div className="h-full w-full flex items-center justify-center bg-black/5">
                    <span className="text-xs text-muted-foreground">🎬 Video</span>
                  </div>
                ) : (
                  <Image src={img.url} alt={img.productName} fill className="object-cover" sizes="(max-width: 640px) 50vw, 25vw" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <Button variant="secondary" size="sm" onClick={() => { setEditingImage(img.productId); setEditTags([...img.tags]); }}>
                    <Tag className="h-4 w-4 mr-1" /> Edit Tags
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteImage(img.productId, img.url)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-2">
                <p className="text-xs font-medium truncate">{img.productName}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {img.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">{tag}</Badge>
                  ))}
                  {img.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{img.tags.length - 3}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Tags Dialog */}
      {editingImage && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setEditingImage(null)}>
          <div className="bg-background rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-4">Edit Image Tags</h3>
            
            <div className="flex flex-wrap gap-1.5 mb-4 min-h-[40px] p-2 border border-border rounded-lg">
              {editTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="pr-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="ml-1 hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag..." onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
              <Button variant="outline" size="sm" onClick={addTag}>Add</Button>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {PREDEFINED_TAGS.filter((t) => !editTags.includes(t)).slice(0, 12).map((tag) => (
                <Button key={tag} variant="outline" size="sm" className="text-xs h-7" onClick={() => { setEditTags([...editTags, tag]); }}>
                  + {tag}
                </Button>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingImage(null)}>Cancel</Button>
              <Button onClick={() => handleSaveTags(editingImage)} disabled={saving}>
                {saving ? "Saving..." : "Save Tags"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}