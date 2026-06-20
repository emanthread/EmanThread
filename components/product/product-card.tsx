"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, Heart, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/cart-store";
import { useWishlistStore } from "@/lib/wishlist-store";
import { formatPrice, type Product } from "@/lib/data";
import { cn, getProductImage } from "@/lib/utils";
import { QuickViewModal } from "./quick-view-modal";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const { addItem } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddToCart = () => {
    addItem(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const inWishlist = mounted && isInWishlist(product.id);

  const badgeVariants: Record<string, string> = {
    New: "bg-emerald-600 text-white",
    Trending: "bg-accent text-accent-foreground",
    Hot: "bg-red-600 text-white",
    Limited: "bg-primary text-primary-foreground",
  };

  return (
    <>
      <div
        className="group relative rounded-2xl overflow-hidden shadow-md transition-all duration-500 hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1"
      >
        {/* Image Container */}
        <div className="relative aspect-[2/3] bg-secondary overflow-hidden rounded-2xl">
          <Link href={`/product/${product.id}`} className="relative block h-full w-full">
            <Image
              src={getProductImage(product.images)}
              alt={product.name}
              fill
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-700 scale-100 lg:group-hover:scale-110"
            />
            {product.images[1] && (
              <Image
                src={product.images[1]}
                alt={product.name}
                fill
                loading="lazy"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover absolute inset-0 transition-all duration-700 opacity-0 lg:group-hover:opacity-100 scale-100 lg:group-hover:scale-110"
              />
            )}
          </Link>

          {/* Badge */}
          {product.badge && (
            <Badge
              className={cn(
                "absolute top-4 left-4 text-xs font-medium tracking-wider uppercase",
                badgeVariants[product.badge]
              )}
            >
              {product.badge}
            </Badge>
          )}
          {product.price >= 6000 && (
            <Badge className="absolute top-4 right-4 bg-black/70 text-white backdrop-blur-sm">
              Premium Pick
            </Badge>
          )}

          {/* Quick Actions */}
          <div
            className="absolute bottom-0 left-0 right-0 p-4 flex gap-2 transition-all duration-300 opacity-95 translate-y-0 lg:group-hover:opacity-100"
          >
            <Button
              size="sm"
              className="flex-1 bg-background/95 hover:bg-background text-foreground backdrop-blur-sm"
              onClick={handleAddToCart}
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
            {/* Screen-reader announcement when item is added to cart */}
            {justAdded && (
              <span aria-live="assertive" className="sr-only">
                Added {product.name} to cart
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="bg-background/95 hover:bg-background backdrop-blur-sm border-0"
              onClick={() => setIsQuickViewOpen(true)}
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">Quick view</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={cn(
                "bg-background/95 hover:bg-background backdrop-blur-sm border-0",
                inWishlist && "text-red-500"
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleItem(product);
              }}
            >
              <Heart className={cn("h-4 w-4", inWishlist && "fill-current")} />
              <span className="sr-only">Save to wishlist</span>
            </Button>
          </div>
        </div>

        {/* Product Info */}
        <div className="mt-4 space-y-1 px-3 pb-4">
          <p className="text-xs text-muted-foreground tracking-wider uppercase">
            {product.fabricType}{product.color && ` • ${product.color}`}
          </p>
          <Link href={`/product/${product.id}`}>
            <h3 className="font-medium text-sm leading-tight hover:text-accent transition-colors line-clamp-2">
              {product.name}
            </h3>
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </>
  );
}
