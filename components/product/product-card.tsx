"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Eye, Heart, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/cart-store";
import { useWishlistStore } from "@/lib/wishlist-store";
import { formatPrice, type Product } from "@/lib/data";
import {
  getVariantUnitPrice,
  getActiveVariants,
  getProductOptions,
  hasUnavailableRequiredSelection,
  isProductAvailableForPurchase,
  requiresVariantSelectionForPurchase,
} from "@/lib/commerce";
import { cn, getProductImage } from "@/lib/utils";

// Lazy-load QuickViewModal — only needed on click, not on every card render.
// With up to 20 cards per page this saves significant initial JS bundle size.
const QuickViewModal = dynamic(
  () => import("./quick-view-modal").then((m) => ({ default: m.QuickViewModal })),
  { ssr: false, loading: () => null }
);

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const { addItem } = useCartStore();
  const { toggleItem, isInWishlist, isIdentityResolved } = useWishlistStore();

  const productImage = product.images[0] || getProductImage(product.images);
  const selectionRequired = requiresVariantSelectionForPurchase(product);
  const requiredSelectionUnavailable = hasUnavailableRequiredSelection(product);
  const productAvailable = isProductAvailableForPurchase(product);
  const activeVariants = getActiveVariants(product);
  const variantPrices = activeVariants.map((variant) => getVariantUnitPrice(product, variant));
  const displayedPrice = variantPrices.length ? Math.min(...variantPrices) : getVariantUnitPrice(product);
  const maximumPrice = variantPrices.length ? Math.max(...variantPrices) : displayedPrice;
  const displayedOriginalPrice = product.originalPrice
    ? product.originalPrice
    : undefined;
  const colorValues = getProductOptions(product)
    .filter((option) => option.type === "COLOR" || option.type === "SHADE")
    .flatMap((option) => option.values)
    .filter((value) => value.isActive && /^#[0-9a-f]{6}$/i.test(value.swatchHex || ""));

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleProductClick = () => {
    setIsNavigating(true);
    // Reset after navigation completes (safety fallback)
    setTimeout(() => setIsNavigating(false), 3000);
  };

  const handleAddToCart = () => {
    if (!productAvailable || selectionRequired) return;

    addItem(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const wishlistReady = mounted && isIdentityResolved;
  const inWishlist = wishlistReady && isInWishlist(product.id);
  const badgeVariants: Record<string, string> = {
    New: "bg-emerald-600 text-white",
    Trending: "bg-accent text-accent-foreground",
    Hot: "bg-red-600 text-white",
    Limited: "bg-primary text-primary-foreground",
  };

  return (
    <>
      <div className="group relative overflow-hidden rounded-2xl shadow-md transition-all duration-500 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl">
        {/* Image Container */}
        <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-secondary">
          <Link href={`/product/${product.id}`} className="relative block h-full w-full" onClick={handleProductClick}>
            <Image
              src={productImage}
              alt={product.name}
              fill
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-700 scale-100 lg:group-hover:scale-110"
            />
            {/* Shimmer overlay — sweeps left-to-right on click */}
            <div
              className={cn(
                "pointer-events-none absolute inset-0 transition-opacity duration-300",
                isNavigating ? "opacity-100" : "opacity-0"
              )}
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: isNavigating ? "shimmerSweep 0.7s ease-in-out infinite" : "none",
              }}
            />
          </Link>

          {product.badge && (
            <Badge
              className={cn(
                "absolute left-4 top-4 text-xs font-medium uppercase tracking-wider",
                badgeVariants[product.badge]
              )}
            >
              {product.badge}
            </Badge>
          )}
          {displayedPrice >= 6000 && (
            <Badge className="absolute right-4 top-4 bg-black/70 text-white backdrop-blur-sm">
              Premium Pick
            </Badge>
          )}

          {/* Wishlist — floating top-right corner */}
          {wishlistReady && (
            <button
              type="button"
              aria-label={inWishlist ? "Remove from wishlist" : "Save to wishlist"}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleItem(product);
              }}
              className={cn(
                "absolute right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/85 shadow-md backdrop-blur-sm transition-all duration-200",
                "hover:bg-background hover:scale-110 active:scale-95",
                // Show below Premium Pick badge if present, otherwise align with left badge
                displayedPrice >= 6000 ? "top-14" : "top-3",
                inWishlist ? "text-red-500" : "text-foreground"
              )}
            >
              <Heart className={cn("h-4 w-4", inWishlist && "fill-current")} />
            </button>
          )}

          {/* Quick Actions — View Product + Quick View only */}
          <div className="absolute bottom-0 left-0 right-0 flex gap-2 p-4 opacity-95 transition-all duration-300 lg:translate-y-0 lg:group-hover:opacity-100">
            {selectionRequired && productAvailable && !requiredSelectionUnavailable ? (
              <Button
                size="sm"
                className="flex-1 bg-background/95 text-foreground backdrop-blur-sm hover:bg-background"
                asChild
              >
                <Link href={`/product/${product.id}`} onClick={handleProductClick}>
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  View Product
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                className={cn(
                  "flex-1 backdrop-blur-sm transition-all",
                  !productAvailable 
                    ? "disabled:opacity-100 disabled:bg-destructive disabled:text-destructive-foreground" 
                    : "bg-background/95 text-foreground hover:bg-background"
                )}
                onClick={handleAddToCart}
                disabled={!productAvailable}
              >
                {productAvailable && <ShoppingBag className="mr-2 h-4 w-4" />}
                {requiredSelectionUnavailable ? "Option Unavailable" : productAvailable ? "Add to Cart" : "Out of Stock"}
              </Button>
            )}
            {/* Screen-reader announcement when item is added to cart */}
            {justAdded && (
              <span aria-live="assertive" className="sr-only">
                Added {product.name} to cart
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="border-0 bg-background/95 backdrop-blur-sm hover:bg-background"
              onClick={() => setIsQuickViewOpen(true)}
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">Quick view</span>
            </Button>
          </div>
        </div>

        {/* Product Info */}
        <div className="mt-4 space-y-1 px-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {product.fabricType}{product.color && ` • ${product.color}`}
          </p>
          <Link href={`/product/${product.id}`} onClick={handleProductClick}>
            <h3 className="line-clamp-2 text-sm font-medium leading-tight transition-colors hover:text-accent">
              {product.name}
            </h3>
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{maximumPrice !== displayedPrice ? "From " : ""}{formatPrice(displayedPrice)}</span>
            {displayedOriginalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(displayedOriginalPrice)}
              </span>
            )}
          </div>
          {colorValues.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1" aria-label={`${colorValues.length} available colors or shades`}>
              {colorValues.slice(0, 6).map((value) => (
                <span
                  key={value.id}
                  className="h-4 w-4 rounded-full border border-black/15 shadow-sm"
                  style={{ backgroundColor: value.swatchHex }}
                  title={value.label}
                />
              ))}
              {colorValues.length > 6 && (
                <span className="text-[10px] text-muted-foreground">+{colorValues.length - 6}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal product={product} isOpen={isQuickViewOpen} onClose={() => setIsQuickViewOpen(false)} />

      {/* Shimmer animation keyframes */}
      <style jsx global>{`
        @keyframes shimmerSweep {
          0% { background-position: -100% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </>
  );
}
