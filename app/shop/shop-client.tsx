"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { ProductCard } from "@/components/product/product-card";
import { type Product, type Category } from "@/lib/data";
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
import { SlidersHorizontal, X, Grid3X3, LayoutGrid, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FlashSaleBanner } from "@/app/components/flash-sale-banner";
 
interface ShopClientProps {
  initialProducts: Product[];
  initialCategories: any[];
  initialColors: string[];
  initialSeasons: string[];
}

export function ShopContent({ 
  initialProducts, 
  initialCategories, 
  initialColors, 
  initialSeasons 
}: ShopClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get("category");

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories] = useState(initialCategories);
  const [colors] = useState<string[]>(initialColors);
  const [seasons] = useState<string[]>(initialSeasons);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialProducts.length === 20);

  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    categoryParam ? categoryParam.split(",") : []
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState("featured");
  const [gridSize, setGridSize] = useState<"small" | "large">("large");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // We skip fetching on the very first mount because we have initialProducts
  const isFirstRender = useRef(true);

  // Build query string from filters
  const buildQueryString = useCallback((pageNum = 1) => {
    const params = new URLSearchParams();
    if (selectedCategories.length > 0) {
      params.set("category", selectedCategories.join(","));
    }
    if (priceRange[0] > 0) params.set("minPrice", String(priceRange[0]));
    if (priceRange[1] < 10000) params.set("maxPrice", String(priceRange[1]));
    if (sortBy !== "featured") params.set("sort", sortBy);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    if (selectedColor) params.set("color", selectedColor);
    if (selectedSeason) params.set("season", selectedSeason);
    params.set("page", String(pageNum));
    params.set("limit", "20");
    return params.toString();
  }, [selectedCategories, priceRange, sortBy, searchQuery, selectedColor, selectedSeason]);

  const fetchProducts = useCallback(async (pageNum = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const qs = buildQueryString(pageNum);
      const url = `/api/products?${qs}`;
      const res = await fetch(url);
      const data = await res.json();
      
      const newProducts = Array.isArray(data) ? data : (data.products || []);
      
      if (append) {
        setProducts(prev => [...prev, ...newProducts]);
      } else {
        setProducts(newProducts);
      }
      
      setHasMore(newProducts.length === 20);
      setPage(pageNum);
    } catch (e) {
      console.error("Failed to fetch products:", e);
      if (!append) setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildQueryString]);

  const normalizeSlug = useCallback((s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ''), []);

  useEffect(() => {
    setSelectedCategories((prev) => {
      if (categoryParam && categories.length > 0) {
        const slugs = categoryParam.split(",");
        const matchedIds = slugs.map((slug) => {
          const normalizedParam = normalizeSlug(slug);
          const matched = categories.find(
            (cat) =>
              cat.id === slug ||
              normalizeSlug(cat.name) === normalizedParam
          );
          return matched ? matched.id : slug;
        });
        
        const currentSorted = [...prev].sort().join(",");
        const matchedSorted = [...matchedIds].sort().join(",");
        
        if (currentSorted !== matchedSorted) {
          return matchedIds;
        }
        return prev;
      } else if (!categoryParam) {
        if (prev.length > 0) return [];
      }
      return prev;
    });
  }, [categoryParam, categories, normalizeSlug]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchProducts(1, false);
  }, [
    selectedCategories,
    priceRange,
    sortBy,
    searchQuery,
    selectedColor,
    selectedSeason,
    fetchProducts
  ]);

  useEffect(() => {
    // Only update URL if filters actually changed (don't include page)
    const qs = buildQueryString(1);
    const params = new URLSearchParams(qs);
    params.delete('page');
    params.delete('limit');
    const newUrl = params.toString() ? `/shop?${params.toString()}` : "/shop";
    router.replace(newUrl, { scroll: false });
  }, [selectedCategories, priceRange, sortBy, searchQuery, selectedColor, selectedSeason, router, buildQueryString]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setPriceRange([0, 10000]);
    setSortBy("featured");
    setSearchQuery("");
    setSearchInput("");
    setSelectedColor("");
    setSelectedSeason("");
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(value);
    }, 500);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchProducts(page + 1, true);
    }
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>

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

            <div className="flex-1">
              {loading && !loadingMore ? (
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
                <>
                  <div
                    className={cn(
                      "grid gap-3 sm:gap-6",
                      gridSize === "large"
                        ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3"
                        : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                    )}
                  >
                    {products.map((product, i) => (
                      <ProductCard key={`shop-${product.id}`} product={product} priority={i < 4} />
                    ))}
                  </div>
                  
                  {hasMore && (
                    <div className="mt-12 flex justify-center">
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="min-w-[200px]"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          "Load More"
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
