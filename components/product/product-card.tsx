"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye, Heart, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductOptionPicker } from "@/components/product/product-option-picker";
import { useCartStore } from "@/lib/cart-store";
import { useWishlistStore } from "@/lib/wishlist-store";
import { formatPrice, type Product, type ProductVariant } from "@/lib/data";
import {
  getActiveVariants,
  getVariantUnitPrice,
  hasUnavailableRequiredSelection,
  isProductAvailableForPurchase,
  isVariantAvailable,
  productOptionForVariant,
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

type CartSelection = {
  variant: {
    id: string;
    label: string;
    sku?: string;
    priceAdjustment: number;
  };
  selectedOptions: Array<{ label: string; value: string }>;
  unitPrice: number;
};

type AddItemWithSelection = (
  product: Product,
  quantity?: number,
  stitchingOptions?: { price: number; profileId: string; profileName: string },
  selection?: CartSelection
) => void;

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [manualImageIndex, setManualImageIndex] = useState<number | null>(null);
  const [isOptionPickerOpen, setIsOptionPickerOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [optionError, setOptionError] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const suppressLinkClick = useRef(false);
  const { addItem } = useCartStore();
  const { toggleItem, isInWishlist, isIdentityResolved } = useWishlistStore();

  const productImages = product.images.length > 0 ? product.images : [getProductImage(product.images)];
  const activeVariants = getActiveVariants(product);
  const selectedVariant = activeVariants.find((variant) => variant.id === selectedVariantId) ?? null;
  const selectionRequired = requiresVariantSelectionForPurchase(product);
  const requiredSelectionUnavailable = hasUnavailableRequiredSelection(product);
  const hasOptions = Boolean(product.commerce && (activeVariants.length > 0 || selectionRequired));
  const productAvailable = isProductAvailableForPurchase(product);
  const displayedPrice = getVariantUnitPrice(product, selectedVariant);
  const displayedOriginalPrice = product.originalPrice
    ? product.originalPrice + (selectedVariant?.priceAdjustment ?? 0)
    : undefined;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setManualImageIndex(null);
    setSelectedVariantId(null);
    setOptionError(false);
    setIsOptionPickerOpen(false);
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
    if (event.pointerType === "touch" && !(event.target as HTMLElement).closest("button")) {
      touchStartX.current = event.clientX;
    }
  };

  const handleImagePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || touchStartX.current === null) return;

    const distance = event.clientX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(distance) < 36 || productImages.length < 2) return;

    handleImageChange(distance > 0 ? -1 : 1);
    // The touch gesture ends with a click on the image link in some browsers.
    // Swallow that one click so a gallery swipe never navigates away.
    suppressLinkClick.current = true;
    window.setTimeout(() => {
      suppressLinkClick.current = false;
    }, 500);
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    setSelectedVariantId(variant.id);
    setOptionError(false);
  };

  const handleAddToCart = () => {
    if (!productAvailable) return;

    if (selectionRequired && (!selectedVariant || !isVariantAvailable(selectedVariant))) {
      setIsOptionPickerOpen(true);
      setOptionError(true);
      return;
    }

    const selection: CartSelection | undefined = selectedVariant
      ? {
          variant: {
            id: selectedVariant.id,
            label: selectedVariant.label,
            sku: selectedVariant.sku,
            priceAdjustment: selectedVariant.priceAdjustment,
          },
          selectedOptions: [productOptionForVariant(product, selectedVariant)],
          unitPrice: displayedPrice,
        }
      : undefined;

    // The cart keeps its existing three-argument call shape for legacy fabric
    // products. The fourth, optional selection is consumed only by the new
    // additive commerce path.
    (addItem as AddItemWithSelection)(product, 1, undefined, selection);
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
            touchStartX.current = null;
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
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/90 p-2 text-foreground opacity-100 shadow-sm backdrop-blur-sm transition hover:bg-background lg:opacity-0 lg:group-hover:opacity-100"
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
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/90 p-2 text-foreground opacity-100 shadow-sm backdrop-blur-sm transition hover:bg-background lg:opacity-0 lg:group-hover:opacity-100"
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
            <Button
              size="sm"
              className="flex-1 bg-background/95 text-foreground backdrop-blur-sm hover:bg-background"
              onClick={handleAddToCart}
              disabled={!productAvailable}
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              {requiredSelectionUnavailable ? "Option Unavailable" : productAvailable ? "Add to Cart" : "Out of Stock"}
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
          {selectedVariant && (
            <p className="text-xs text-muted-foreground">
              {product.commerce?.optionLabel?.trim() || "Option"}: {selectedVariant.label}
            </p>
          )}
        </div>

        {hasOptions && (
          <div className="px-3 pb-4 pt-3">
            {requiredSelectionUnavailable ? (
              <div
                className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                role="status"
              >
                No {product.commerce?.optionLabel?.trim() || "options"} available right now.
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-md border px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-secondary",
                    optionError ? "border-destructive text-destructive" : "border-border"
                  )}
                  aria-expanded={isOptionPickerOpen}
                  onClick={() => {
                    setIsOptionPickerOpen((open) => !open);
                    setOptionError(false);
                  }}
                >
                  {selectedVariant
                    ? `${product.commerce?.optionLabel?.trim() || "Option"}: ${selectedVariant.label}`
                    : `Choose ${product.commerce?.optionLabel?.trim() || "option"}${selectionRequired ? " *" : ""}`}
                </button>
                {isOptionPickerOpen && (
                  <ProductOptionPicker
                    product={product}
                    selectedVariantId={selectedVariantId}
                    onSelect={handleVariantSelect}
                    invalid={optionError}
                    compact
                    className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200"
                  />
                )}
              </>
            )}
          </div>
        )}
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
