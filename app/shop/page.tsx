"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { ProductCard } from "@/components/product/product-card";
import { type Product } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SlidersHorizontal, X, Grid3X3, LayoutGrid, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { FlashSaleBanner } from "@/app/components/flash-sale-banner";
 
function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get("category");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<
    { id: string; name: string; description: string; image: string; productCount: number }[]
  >([]);
  const [colors, setColors] = useState<string[]>([]);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    categoryParam ? [categoryParam] : []
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState("featured");
  const [gridSize, setGridSize] = useState<"small" | "large">("large");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build query string from filters
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedCategories.length === 1) params.set("category", selectedCategories[0]);
    if (priceRange[0] > 0) params.set("minPrice", String(priceRange[0]));
    if (priceRange[1] < 10000) params.set("maxPrice", String(priceRange[1]));
    if (sortBy !== "featured") params.set("sort", sortBy);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    if (selectedColor) params.set("color", selectedColor);
    if (selectedSeason) params.set("season", selectedSeason);
    return params.toString();
  }, [selectedCategories, priceRange, sortBy, searchQuery, selectedColor, selectedSeason]);

  // Fetch products with filters
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const qs = buildQueryString();
      const url = qs ? `/api/products?${qs}` : "/api/products";
      const res = await fetch(url);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch products:", e);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [buildQueryString]);

  // Helper: strip all non-alphanumeric chars for slug-to-name matching
  // e.g. "wash-wear" → "washwear", "Wash & Wear" → "washwear"
  const normalizeSlug = useCallback((s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ''), []);

  // Fetch categories, colors, and seasons on mount
  useEffect(() => {
    async function fetchMeta() {
      try {
        const [categoriesRes, colorsRes, seasonsRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/products/colors"),
          fetch("/api/products/seasons"),
        ]);
        const categoriesData = await categoriesRes.json();
        const colorsData = await colorsRes.json();
        const seasonsData = await seasonsRes.json();
        setCategories(categoriesData);
        setColors(Array.isArray(colorsData) ? colorsData : []);
        setSeasons(Array.isArray(seasonsData) ? seasonsData : []);

        // Resolve URL category slug (e.g. "cotton", "wash-wear") to real Prisma ID
        if (categoryParam && Array.isArray(categoriesData) && categoriesData.length > 0) {
          const normalizedParam = normalizeSlug(categoryParam);
          const matched = categoriesData.find(
            (cat: any) =>
              cat.id === categoryParam || // already a real ID
              normalizeSlug(cat.name) === normalizedParam // slug matches category name
          );
          if (matched) {
            setSelectedCategories([matched.id]);
          }
        }
      } catch (e) {
        console.error("Failed to fetch meta:", e);
      }
    }
    fetchMeta();
  }, []);

  // Fetch products whenever filters change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Sync filters to URL (replace, no page reload)
  useEffect(() => {
    const qs = buildQueryString();
    const newUrl = qs ? `/shop?${qs}` : "/shop";
    router.replace(newUrl, { scroll: false });
  }, [buildQueryString, router]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [categoryId]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setPriceRange([0, 10000]);
    setSortBy("featured");
    setSearchQuery("");
    setSelectedColor("");
    setSelectedSeason("");
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      // fetchProducts will run via useEffect when buildQueryString changes
    }, 500);
  };

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    priceRange[0] > 0 ||
    priceRange[1] < 10000 ||
    sortBy !== "featured" ||
    searchQuery.trim().length > 0 ||
    selectedColor !== "" ||
    selectedSeason !== "";

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen pt-20">
        {/* Page Header */}
        <FlashSaleBanner />
        <div className="bg-secondary/50 py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-center">
              Shop Collection
            </h1>
            <p className="mt-4 text-muted-foreground text-center max-w-2xl mx-auto">
              Explore our curated selection of premium men's unstitched fabrics,
              crafted for the distinguished gentleman.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {selectedCategories.length +
                      (priceRange[0] > 0 || priceRange[1] < 10000 ? 1 : 0) +
                      (searchQuery ? 1 : 0) +
                      (selectedColor ? 1 : 0) +
                      (selectedSeason ? 1 : 0)}
                  </span>
                )}
              </Button>

              <p className="text-sm text-muted-foreground">
                {loading ? "Loading..." : `${products.length} products`}
              </p>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>

              {/* Grid Toggle */}
              <div className="hidden sm:flex border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setGridSize("large")}
                  className={cn(
                    "p-2 transition-colors",
                    gridSize === "large"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  )}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setGridSize("small")}
                  className={cn(
                    "p-2 transition-colors",
                    gridSize === "small"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="trending">Trending</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-8">
            {/* Sidebar Filters - Desktop */}
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-28 space-y-8">
                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-muted-foreground"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear all filters
                  </Button>
                )}

                {/* Categories */}
                <div>
                  <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">
                    Categories
                  </h3>
                  <div className="space-y-3">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center gap-3">
                        <Checkbox
                          id={category.id}
                          checked={selectedCategories.includes(category.id)}
                          onCheckedChange={() => toggleCategory(category.id)}
                        />
                        <Label
                          htmlFor={category.id}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {category.name}
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          {category.productCount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">
                    Price Range
                  </h3>
                  <Slider
                    value={priceRange}
                    onValueChange={(value) =>
                      setPriceRange(value as [number, number])
                    }
                    min={0}
                    max={10000}
                    step={500}
                    className="mt-2"
                  />
                  <div className="flex justify-between mt-3 text-sm text-muted-foreground">
                    <span>PKR {priceRange[0].toLocaleString()}</span>
                    <span>PKR {priceRange[1].toLocaleString()}</span>
                  </div>
                </div>

                {/* Color */}
                {colors.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">
                      Color
                    </h3>
                    <Select
                      value={selectedColor || "all"}
                      onValueChange={(v) => setSelectedColor(v === "all" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Colors" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Colors</SelectItem>
                        {colors.map((color) => (
                          <SelectItem key={color} value={color}>
                            {color}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Season */}
                {seasons.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">
                      Season
                    </h3>
                    <div className="space-y-3">
                      {seasons.map((season) => (
                        <div key={season} className="flex items-center gap-3">
                          <Checkbox
                            id={`season-${season}`}
                            checked={selectedSeason === season}
                            onCheckedChange={() =>
                              setSelectedSeason((prev) => (prev === season ? "" : season))
                            }
                          />
                          <Label
                            htmlFor={`season-${season}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {season}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* Mobile Filters */}
            <div
              className={cn(
                "fixed inset-0 z-50 lg:hidden transition-opacity duration-300",
                showFilters
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
              )}
            >
              <div
                className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
                onClick={() => setShowFilters(false)}
              />
              <div
                className={cn(
                  "absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-background shadow-xl transition-transform duration-300 overflow-y-auto",
                  showFilters ? "translate-x-0" : "-translate-x-full"
                )}
              >
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <h2 className="text-lg font-semibold">Filters</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowFilters(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="p-6 space-y-8">
                  {/* Search Mobile */}
                  <div>
                    <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">
                      Search
                    </h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Categories */}
                  <div>
                    <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">
                      Categories
                    </h3>
                    <div className="space-y-3">
                      {categories.map((category) => (
                        <div key={category.id} className="flex items-center gap-3">
                          <Checkbox
                            id={`mobile-${category.id}`}
                            checked={selectedCategories.includes(category.id)}
                            onCheckedChange={() => toggleCategory(category.id)}
                          />
                          <Label
                            htmlFor={`mobile-${category.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {category.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div>
                    <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">
                      Price Range
                    </h3>
                    <Slider
                      value={priceRange}
                      onValueChange={(value) =>
                        setPriceRange(value as [number, number])
                      }
                      min={0}
                      max={10000}
                      step={500}
                      className="mt-2"
                    />
                    <div className="flex justify-between mt-3 text-sm text-muted-foreground">
                      <span>PKR {priceRange[0].toLocaleString()}</span>
                      <span>PKR {priceRange[1].toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Color Mobile */}
                  {colors.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">
                        Color
                      </h3>
                      <Select
                        value={selectedColor || "all"}
                        onValueChange={(v) => setSelectedColor(v === "all" ? "" : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Colors" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Colors</SelectItem>
                          {colors.map((color) => (
                            <SelectItem key={color} value={color}>
                              {color}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Season Mobile */}
                  {seasons.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">
                        Season
                      </h3>
                      <div className="space-y-3">
                        {seasons.map((season) => (
                          <div key={season} className="flex items-center gap-3">
                            <Checkbox
                              id={`mobile-season-${season}`}
                              checked={selectedSeason === season}
                              onCheckedChange={() =>
                                setSelectedSeason((prev) => (prev === season ? "" : season))
                              }
                            />
                            <Label
                              htmlFor={`mobile-season-${season}`}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {season}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={clearFilters}
                    >
                      Clear
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => setShowFilters(false)}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="flex-1">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[2/3] bg-secondary/50 rounded-2xl animate-pulse"
                    />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-lg text-muted-foreground">
                    No products found matching your filters.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={clearFilters}
                  >
                    Clear all filters
                  </Button>
                </div>
              ) : (
                <div
                  className={cn(
                    "grid gap-6",
                    gridSize === "large"
                      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                      : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                  )}
                >
                  {products.map((product) => (
                    <ProductCard key={`shop-${product.id}`} product={product} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://emaanthreads.com";

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": siteUrl,
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Shop",
      "item": `${siteUrl}/shop`,
    },
  ],
};

export default function ShopPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <ShopContent />
      </Suspense>
    </>
  );
}
