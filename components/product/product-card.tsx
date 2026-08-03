"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye, Heart, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/cart-store";
import { useWishlistStore } from "@/lib/wishlist-store";
import { formatPrice, type Product } from "@/lib/data";
import {
  getVariantUnitPrice,
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
  const [manualImageIndex, setManualImageIndex] = useState<number | null>(null);
  const touchStart = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const suppressLinkClick = useRef(false);
  const { addItem } = useCartStore();
  const { toggleItem, isInWishlist, isIdentityResolved } = useWishlistStore();

  const productImages = product.images.length > 0 ? product.images : [getProductImage(product.images)];
  const selectionRequired = requiresVariantSelectionForPurchase(product);
  const requiredSelectionUnavailable = hasUnavailableRequiredSelection(product);
  const productAvailable = isProductAvailableForPurchase(product);
  const displayedPrice = getVariantUnitPrice(product);
  const displayedOriginalPrice = product.originalPrice
    ? product.originalPrice
    : undefined;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setManualImageIndex(null);
  }, [product.id]);

  const handleProductClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (suppressLinkClick.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    setIsNavigating(true);
    // Reset after navigation completes (safety fallback)
    setTimeout(() => setIsNavigating(false), 3000);
  };

  const handleImageChange = (direction: -1 | 1) => {
    setManualImageIndex((current) => {
      const currentIndex = current ?? 0;
      return (currentIndex + direction + productImages.length) % productImages.length;
    });
  };

  const handleImagePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || (event.target as HTMLElement).closest("button")) return;

    touchStart.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };

    // Keep receiving the end event when a deliberate swipe finishes beyond the
    // card's edge. `touch-pan-y` still leaves normal vertical page scrolling intact.
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleImagePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    if (event.pointerType !== "touch" || !start || start.pointerId !== event.pointerId) return;

    const horizontalDistance = event.clientX - start.x;
    const verticalDistance = event.clientY - start.y;
    touchStart.current = null;

    // Do not turn a vertical page scroll into an image change. A short, normal
    // tap is still handled by the product link below.
    if (
      Math.abs(horizontalDistance) < 36 ||
      Math.abs(horizontalDistance) <= Math.abs(verticalDistance) ||
      productImages.length < 2
    ) return;

    handleImageChange(horizontalDistance > 0 ? -1 : 1);
    // The touch gesture ends with a click on the image link in some browsers.
    // Swallow that one click so a gallery swipe never navigates away.
    suppressLinkClick.current = true;
    window.setTimeout(() => {
      suppressLinkClick.current = false;
    }, 500);
  };

  const handleAddToCart = () => {
    if (!productAvailable || selectionRequired) return;

    addItem(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const wishlistReady = mounted && isIdentityResolved;
  const inWishlist = wishlistReady && isInWishlist(product.id);
  const displayedImageIndex = manualImageIndex ?? 0;

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
        <div
          className="relative aspect-[2/3] touch-pan-y overflow-hidden rounded-2xl bg-secondary"
          onPointerDown={handleImagePointerDown}
          onPointerUp={handleImagePointerEnd}
          onPointerCancel={() => {
            touchStart.current = null;
          }}
        >
          <Link href={`/product/${product.id}`} className="relative block h-full w-full" onClick={handleProductClick}>
            <Image
              src={productImages[displayedImageIndex]}
              alt={product.name}
              fill
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-700 scale-100 lg:group-hover:scale-110"
            />
            {/* Keep the original desktop hover preview until a shopper manually chooses an image. */}
            {manualImageIndex === null && productImages[1] && (
              <Image
                src={productImages[1]}
                alt={`${product.name} alternate view`}
                fill
                loading="lazy"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="absolute inset-0 scale-100 object-cover opacity-0 transition-all duration-700 lg:group-hover:scale-110 lg:group-hover:opacity-100"
              />
            )}
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

          {productImages.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Show previous product image"
                className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/95 text-foreground shadow-sm backdrop-blur-sm transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleImageChange(-1);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Show next product image"
                className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/95 text-foreground shadow-sm backdrop-blur-sm transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleImageChange(1);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="sr-only" aria-live="polite">
                Image {displayedImageIndex + 1} of {productImages.length}
              </span>
            </>
          )}

          {/* Badge */}
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

          {/* Quick Actions */}
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
                className="flex-1 bg-background/95 text-foreground backdrop-blur-sm hover:bg-background"
                onClick={handleAddToCart}
                disabled={!productAvailable}
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
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
            <Button
              size="sm"
              variant="outline"
              className={cn(
                "border-0 bg-background/95 backdrop-blur-sm hover:bg-background",
                inWishlist && "text-red-500",
                !wishlistReady && "invisible"
              )}
              disabled={!wishlistReady}
              aria-hidden={!wishlistReady}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleItem(product);
              }}
            >
              <Heart className={cn("h-4 w-4", inWishlist && "fill-current")} />
              <span className="sr-only">Save to wishlist</span>
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
            <span className="font-semibold">{formatPrice(displayedPrice)}</span>
            {displayedOriginalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(displayedOriginalPrice)}
              </span>
            )}
          </div>
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
