"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Plus, Trash2, GripVertical, ExternalLink, Upload, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface HeroSlide {
  image: string;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  link: string;
}

interface PromoStat {
  value: string;
  label: string;
}

interface PromoBanner {
  image: string;
  subtitle: string;
  title: string;
  description: string;
  stats: PromoStat[];
  cta: string;
  link: string;
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

function SlideEditor({
  slide,
  index,
  onChange,
  onRemove,
}: {
  slide: HeroSlide;
  index: number;
  onChange: (index: number, slide: HeroSlide) => void;
  onRemove: (index: number) => void;
}) {
  const update = (field: keyof HeroSlide, value: string) => {
    onChange(index, { ...slide, [field]: value });
  };

  return (
    <Card className="relative">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
          <CardTitle className="text-base">Slide {index + 1}</CardTitle>
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
          currentImage={slide.image}
          onImageChange={(url) => update("image", url)}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={slide.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="The Art of Fine Fabric"
            />
          </div>
          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Input
              value={slide.subtitle}
              onChange={(e) => update("subtitle", e.target.value)}
              placeholder="Summer Collection 2026"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={slide.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Discover our curated selection..."
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>CTA Text</Label>
            <Input
              value={slide.cta}
              onChange={(e) => update("cta", e.target.value)}
              placeholder="Shop Collection"
            />
          </div>
          <div className="space-y-2">
            <Label>CTA Link</Label>
            <Input
              value={slide.link}
              onChange={(e) => update("link", e.target.value)}
              placeholder="/shop"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PromoBannerEditor({
  promo,
  onChange,
}: {
  promo: PromoBanner;
  onChange: (promo: PromoBanner) => void;
}) {
  const updateField = (field: keyof PromoBanner, value: any) => {
    onChange({ ...promo, [field]: value });
  };

  const updateStat = (index: number, stat: PromoStat) => {
    const stats = [...promo.stats];
    stats[index] = stat;
    onChange({ ...promo, stats });
  };

  const removeStat = (index: number) => {
    const stats = promo.stats.filter((_, i) => i !== index);
    onChange({ ...promo, stats });
  };

  const addStat = () => {
    onChange({ ...promo, stats: [...promo.stats, { value: "", label: "" }] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Promo Banner</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ImageUploader
          currentImage={promo.image}
          onImageChange={(url) => updateField("image", url)}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Input
              value={promo.subtitle}
              onChange={(e) => updateField("subtitle", e.target.value)}
              placeholder="Limited Time Offer"
            />
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={promo.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Summer Collection Sale"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={promo.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Enjoy up to 30% off..."
            rows={3}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Stats</Label>
            <Button variant="outline" size="sm" onClick={addStat}>
              <Plus className="h-3 w-3 mr-1" /> Add Stat
            </Button>
          </div>
          {promo.stats.map((stat, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={stat.value}
                onChange={(e) => updateStat(i, { ...stat, value: e.target.value })}
                placeholder="30%"
                className="w-24 font-semibold"
              />
              <Input
                value={stat.label}
                onChange={(e) => updateStat(i, { ...stat, label: e.target.value })}
                placeholder="Off Selected Items"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 h-9 w-9 shrink-0"
                onClick={() => removeStat(i)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>CTA Text</Label>
            <Input
              value={promo.cta}
              onChange={(e) => updateField("cta", e.target.value)}
              placeholder="Shop the Sale"
            />
          </div>
          <div className="space-y-2">
            <Label>CTA Link</Label>
            <Input
              value={promo.link}
              onChange={(e) => updateField("link", e.target.value)}
              placeholder="/shop?sale=true"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const DEFAULT_PROMO: PromoBanner = {
  image: "/images/fabrics/promo_1776582682565.png",
  subtitle: "Limited Time Offer",
  title: "Summer Collection Sale",
  description:
    "Enjoy up to 30% off on our exclusive summer collection. Premium fabrics, unmatched quality - now at exceptional prices. Don\u2019t miss this opportunity to elevate your wardrobe.",
  stats: [
    { value: "30%", label: "Off Selected Items" },
    { value: "Free", label: "Shipping Over PKR 5,000" },
  ],
  cta: "Shop the Sale",
  link: "/shop?sale=true",
};

export default function HeroSlidesPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [promoBanner, setPromoBanner] = useState<PromoBanner>(DEFAULT_PROMO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/hero-slides");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      if (data.slides) setSlides(data.slides);
      if (data.promoBanner) setPromoBanner(data.promoBanner);
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

  const handleSlideChange = (index: number, slide: HeroSlide) => {
    const updated = [...slides];
    updated[index] = slide;
    setSlides(updated);
  };

  const handleRemoveSlide = (index: number) => {
    if (slides.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "You need at least 1 slide",
        variant: "destructive",
      });
      return;
    }
    setSlides((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddSlide = () => {
    setSlides((prev) => [
      ...prev,
      {
        image: "",
        title: "New Slide",
        subtitle: "Subtitle",
        description: "Description",
        cta: "Shop Now",
        link: "/shop",
      },
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/hero-slides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides, promoBanner }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      toast({
        title: "Saved",
        description: "Hero slides and promo banner updated successfully",
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
          <h1 className="text-2xl font-semibold">Hero Slides & Promo Banner</h1>
          <p className="text-muted-foreground">
            Manage the hero banner slides and promo banner on the home page
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleAddSlide}>
            <Plus className="h-4 w-4 mr-2" />
            Add Slide
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
        {slides.map((slide, index) => (
          <SlideEditor
            key={index}
            slide={slide}
            index={index}
            onChange={handleSlideChange}
            onRemove={handleRemoveSlide}
          />
        ))}
      </div>

      {slides.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No slides yet. Click "Add Slide" to create one.
        </div>
      )}

      {/* Divider */}
      <hr className="border-t border-border" />

      {/* Promo Banner */}
      <PromoBannerEditor
        promo={promoBanner}
        onChange={setPromoBanner}
      />

      {slides.length > 0 && (
        <div className="text-sm text-muted-foreground bg-muted rounded-lg p-4">
          <p className="font-medium mb-1">Tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Click <strong>Upload Image</strong> to upload a new image from your computer</li>
            <li>Or paste an existing image path in the text field</li>
            <li>Hero slide optimal size: 1920x1080px (16:9 ratio)</li>
            <li>Dark overlay is automatically applied on hero slides for text readability</li>
          </ul>
        </div>
      )}
    </div>
  );
}