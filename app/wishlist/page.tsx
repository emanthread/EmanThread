"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { getProductImage } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/product/product-card";
import { WishlistAddToCart, type WishlistProductResolution } from "@/components/product/wishlist-add-to-cart";
import { Button } from "@/components/ui/button";
import { useWishlistStore } from "@/lib/wishlist-store";
import { formatPrice, type Product } from "@/lib/data";
import { Heart, X } from "lucide-react";

const removeDuplicates = (items: any[]): any[] => {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
};

 
export default function WishlistPage() {
  const [mounted, setMounted] = useState(false);
  const { items, removeItem, clearWishlist } = useWishlistStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [resolvedProducts, setResolvedProducts] = useState<Record<string, Product>>({});
  const [productResolution, setProductResolution] = useState<Record<string, WishlistProductResolution>>({});

  useEffect(() => {
    setMounted(true);
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data) ? data : Array.isArray(data?.products) ? data.products : []))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const productIds = Array.from(new Set(items.map((item) => item.id).filter(Boolean)));
    if (productIds.length === 0) return;

    let cancelled = false;
    setProductResolution((current) => {
      const next = { ...current };
      productIds.forEach((id) => {
        if (next[id] !== "ready") next[id] = "loading";
      });
      return next;
    });

    void Promise.all(
      productIds.map(async (id) => {
        try {
          const response = await fetch(`/api/products/${encodeURIComponent(id)}`);
          const data = await response.json().catch(() => null);
          if (!response.ok || !data?.product) {
            return { id, state: "unavailable" as const };
          }
          return { id, state: "ready" as const, product: data.product as Product };
        } catch {
          return { id, state: "unavailable" as const };
        }
      })
    ).then((results) => {
      if (cancelled) return;
      setProductResolution((current) => ({
        ...current,
        ...Object.fromEntries(results.map((result) => [result.id, result.state])),
      }));
      setResolvedProducts((current) => ({
        ...current,
        ...Object.fromEntries(
          results.flatMap((result) => result.product ? [[result.id, result.product]] : [])
        ),
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [items]);

  if (!mounted) return null;
  
  const uniqueItems = removeDuplicates(items);

  const recommendedProducts = products
    .filter((p) => !uniqueItems.some((item) => item.id === p.id))
    .slice(0, 4);

  return (
    <>
      <Header />
      <main className="min-h-screen pt-20">
        {/* Page Header */}
        <div className="bg-secondary/50 py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-center">
              My Wishlist
            </h1>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          {uniqueItems.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="h-20 w-20 mx-auto text-muted-foreground/30 mb-6" />
              <h2 className="text-2xl font-semibold mb-2">
                Your wishlist is empty
              </h2>
              <p className="text-muted-foreground mb-8">
                Looks like you haven&apos;t added any items to your wishlist yet.
              </p>
              <Button size="lg" asChild>
                <Link href="/women">Continue Shopping</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Wishlist Actions */}
              <div className="flex flex-wrap justify-between items-center gap-4">
                <p className="text-muted-foreground">
                  {uniqueItems.length} {uniqueItems.length === 1 ? "item" : "items"} in your wishlist
                </p>
                <Button variant="ghost" onClick={clearWishlist}>
                  Clear Wishlist
                </Button>
              </div>

              {/* Wishlist Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {uniqueItems.map((savedProduct) => {
                  const product = resolvedProducts[savedProduct.id] ?? savedProduct;
                  const resolution = productResolution[savedProduct.id] ?? "loading";

                  return <div key={`wishlist-${product.id}`} className="group relative">
                    <div className="relative overflow-hidden rounded-lg bg-secondary">
                      <Link href={`/product/${product.id}`}>
                        <Image
                          src={getProductImage(product.images)}
                          alt={product.name}
                          width={400}
                          height={500}
                          className="aspect-[2/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </Link>
                      <button
                        onClick={() => removeItem(savedProduct.id)}
                        className="absolute right-3 top-3 p-2 bg-background/80 backdrop-blur rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-4 space-y-2">
                      <Link href={`/product/${product.id}`} className="block">
                        <h3 className="font-medium line-clamp-2 group-hover:text-accent transition-colors">
                          {product.name}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground">{product.fabricType}</p>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{formatPrice(product.price)}</p>
                        <WishlistAddToCart product={product} resolution={resolution} />
                      </div>
                    </div>
                  </div>;
                })}
              </div>
            </div>
          )}
        </div>

        {/* Recommended Products */}
        {uniqueItems.length > 0 && recommendedProducts.length > 0 && (
          <section className="bg-secondary/30 py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-semibold mb-8">
                You Might Also Like
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommendedProducts.map((product) => (
                  <ProductCard key={`recommended-${product.id}`} product={product} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
