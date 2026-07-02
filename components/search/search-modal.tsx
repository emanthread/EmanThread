"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, X, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, type Product } from "@/lib/data";
import { cn, getProductImage } from "@/lib/utils";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const trendingSearches = [
  "Wash & Wear",
  "Cotton Suit",
  "Boski Silk",
  "Navy Blue",
  "Wedding Collection",
];

const recentSearches = ["Black Cotton", "Premium Fabric", "Khaddar"];

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const latestQuery = useRef(query);
  latestQuery.current = query;

  useEffect(() => {
    if (isOpen && featuredProducts.length === 0) {
      fetch("/api/products?limit=4&sort=featured")
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.products)) {
            setFeaturedProducts(data.products);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, featuredProducts.length]);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(searchQuery)}&limit=10`);
      const data = await res.json();
      
      if (searchQuery !== latestQuery.current) return;

      if (data && Array.isArray(data.products)) {
        setResults(data.products);
      } else {
        setResults([]);
      }
    } catch (e) {
      console.error(e);
      if (searchQuery === latestQuery.current) setResults([]);
    } finally {
      if (searchQuery === latestQuery.current) setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      handleSearch(query);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, handleSearch]);

  const handleProductClick = (product: Product) => {
    router.push(`/product/${product.slug || product.id}`);
    onClose();
    setQuery("");
  };

  const handleQuickSearch = (term: string) => {
    setQuery(term);
    handleSearch(term);
  };

  const handleViewAll = () => {
    router.push(`/shop?search=${encodeURIComponent(query)}`);
    onClose();
    setQuery("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <VisuallyHidden.Root>
          <DialogTitle>Search</DialogTitle>
        </VisuallyHidden.Root>
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 pr-12 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            type="text"
            placeholder="Search for fabrics, colors, styles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 p-0 h-auto text-lg focus-visible:ring-0 placeholder:text-muted-foreground/60"
            autoFocus
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {/* No Query State */}
          {!query && (
            <div className="p-4 space-y-6">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recent Searches
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        onClick={() => handleQuickSearch(term)}
                        className="px-3 py-1.5 text-sm bg-muted rounded-full hover:bg-accent transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Searches */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Trending Searches
                </h3>
                <div className="flex flex-wrap gap-2">
                  {trendingSearches.map((term) => (
                      <button
                      key={term}
                      onClick={() => handleQuickSearch(term)}
                      className="px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              {/* Featured Products */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Featured Products
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {featuredProducts.length > 0 ? (
                    featuredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleProductClick(product)}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted shrink-0">
                          <Image
                            src={getProductImage(product.images)}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {product.name}
                          </p>
                          <p className="text-sm text-accent">
                            {formatPrice(product.price)}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="col-span-2 text-sm text-muted-foreground py-2">
                      Loading featured products...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search Results */}
          {query && (
            <div className="p-4">
              {isSearching ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2 animate-pulse"
                    >
                      <div className="h-16 w-16 rounded-md bg-muted" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-3/4 bg-muted rounded" />
                        <div className="h-3 w-1/2 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : results.length > 0 ? (
                <>
                  {/* Screen-reader: announce results count */}
                  <p aria-live="polite" className="text-sm text-muted-foreground mb-3">
                    {results.length} {results.length === 1 ? 'result' : 'results'} for &quot;{query}&quot;
                  </p>
                  <div className="space-y-2">
                    {results.slice(0, 5).map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleProductClick(product)}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors w-full text-left group"
                      >
                        <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted shrink-0">
                          <Image
                            src={getProductImage(product.images)}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {product.name}
                            </p>
                            {product.badge && (
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[10px] shrink-0",
                                  product.badge === "New" &&
                                    "bg-emerald-500/10 text-emerald-600",
                                  product.badge === "Trending" &&
                                    "bg-blue-500/10 text-blue-600",
                                  product.badge === "Hot" &&
                                    "bg-red-500/10 text-red-600",
                                  product.badge === "Limited" &&
                                    "bg-amber-500/10 text-amber-600"
                                )}
                              >
                                {product.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {product.fabricType} • {product.color}
                          </p>
                          <p className="text-sm font-medium text-accent">
                            {formatPrice(product.price)}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                  {results.length > 5 && (
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={handleViewAll}
                    >
                      View all {results.length} results
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </>
              ) : (
                <div aria-live="polite" className="text-center py-8">
                  <p className="text-muted-foreground">
                    No results found for &quot;{query}&quot;
                  </p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    Try searching for fabric type, color, or style
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
