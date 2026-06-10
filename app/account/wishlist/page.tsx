"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Heart, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProductImage } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { ProductCard } from "@/components/product/product-card";
import { useWishlistStore } from "@/lib/wishlist-store";
import { useCartStore } from "@/lib/cart-store";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "next/navigation";
import { formatPrice, type Product } from "@/lib/data";

export default function AccountWishlistPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const { items, removeItem, clearWishlist } = useWishlistStore();
  const { addItem } = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    setMounted(true);
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  }, []);

  if (!isAuthenticated || !mounted) return null;

  const uniqueItems = items.filter(
    (item, index, self) => self.findIndex((i) => i.id === item.id) === index
  );

  const recommendedProducts = products
    .filter((p) => !uniqueItems.some((item) => item.id === p.id))
    .slice(0, 4);

  return (
    <>
      <Header />
      <CartDrawer />

      <main className="min-h-screen bg-muted/30 pt-28 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <Link
            href="/account"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Account
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-serif">My Wishlist</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Products you have saved
              </p>
            </div>
            {uniqueItems.length > 0 && (
              <Button variant="ghost" onClick={clearWishlist}>
                Clear Wishlist
              </Button>
            )}
          </div>

          {uniqueItems.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Your wishlist is empty</p>
                <p className="text-muted-foreground mb-6">
                  Looks like you haven't added any items to your wishlist yet.
                </p>
                <Button asChild>
                  <Link href="/shop">Continue Shopping</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                {uniqueItems.length} {uniqueItems.length === 1 ? "item" : "items"} in your wishlist
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {uniqueItems.map((product) => (
                  <Card key={`wishlist-${product.id}`} className="overflow-hidden group">
                    <CardContent className="p-0">
                      <div className="flex gap-4 p-4">
                        <div className="relative h-24 w-20 shrink-0 rounded-md overflow-hidden bg-muted">
                          <Link href={`/product/${product.id}`}>
                            <Image
                              src={getProductImage(product.images)}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </Link>
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/product/${product.id}`}
                            className="block"
                          >
                            <h3 className="font-medium line-clamp-2 hover:text-accent transition-colors">
                              {product.name}
                            </h3>
                          </Link>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {product.fabricType}
                          </p>
                          <p className="font-semibold mt-2">
                            {formatPrice(product.price)}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => removeItem(product.id)}
                            className="p-1.5 rounded-full hover:bg-muted transition-colors hover:text-red-600"
                            title="Remove from wishlist"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <Button
                            size="sm"
                            onClick={() => addItem(product)}
                          >
                            <ShoppingCart className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Recommended Products */}
              {recommendedProducts.length > 0 && (
                <section className="pt-8">
                  <h2 className="text-xl font-serif mb-6">You Might Also Like</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {recommendedProducts.map((product) => (
                      <ProductCard key={`recommended-${product.id}`} product={product} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}