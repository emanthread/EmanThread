"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { ProductCard } from "@/components/product/product-card";
import { ProductOptionPicker } from "@/components/product/product-option-picker";
import { SizeGuideModal } from "@/components/product/size-guide-modal";
import { StitchingProfileSelector } from "@/components/stitching/stitching-profile-selector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProductReviews } from "@/components/product/product-reviews";
import { getProductImage } from "@/lib/utils";
import { useCartStore, type StitchingUpdate } from "@/lib/cart-store";
import { useWishlistStore } from "@/lib/wishlist-store";
import { formatPrice, type Product, type ProductVariant } from "@/lib/data";
import {
  getActiveVariants,
  getProductOptions,
  getVariantImages,
  getVariantUnitPrice,
  hasUnavailableRequiredSelection,
  isProductAvailableForPurchase,
  isProductStitchingEligible,
  isUnstitchedColorVariantProduct,
  isVariantAvailable,
  productOptionsForVariant,
  requiresVariantSelectionForPurchase,
} from "@/lib/commerce";
import { cn } from "@/lib/utils";
import { buildWhatsAppUrl, fetchWhatsAppNumber } from "@/lib/whatsapp-utils";
import { ProductFlashSaleBadge } from "@/app/components/flash-sale-banner";
import {
  Plus,
  Minus,
  Heart,
  Truck,
  RotateCcw,
  Shield,
  ChevronLeft,
  ChevronRight,
  Play,
} from "lucide-react";

interface ProductPageClientProps {
  product: Product;
  variations?: Product[];
  frequentlyBought: Product[];
  youMayAlsoLike: Product[];
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

export default function ProductPageClient({
  product,
  variations = [],
  frequentlyBought,
  youMayAlsoLike,
}: ProductPageClientProps) {

  if (!product) {
    notFound();
  }

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen pt-20">
        {/* Breadcrumb */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link
              href="/women"
              className="hover:text-foreground transition-colors"
            >
              Shop
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground truncate max-w-[200px]">
              {product.name}
            </span>
          </nav>
        </div>

        {/* Product Section */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <ProductDetails product={product} variations={variations} />
        </div>

        {/* Frequently Bought Together */}
        {frequentlyBought.length > 0 && (
          <section className="bg-secondary/30 py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-semibold mb-8">
                Frequently Bought Together
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {frequentlyBought.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Related Products */}
        {youMayAlsoLike.length > 0 && (
          <section className="py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-semibold mb-8">You May Also Like</h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {youMayAlsoLike.map((p) => (
                  <ProductCard key={`related-${p.id}`} product={p} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Product Reviews */}
        <ProductReviews productId={product.id} />
      </main>
      <Footer />
    </>
  );
}

function ProductDetailFlashSale() {
  const [endDate, setEndDate] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFlashSale() {
      try {
        const res = await fetch("/api/discounts/active");
        const data = await res.json();
        const discounts = (data.discounts || []) as { endDate?: string }[];
        const now = new Date().getTime();
        // Find the first discount ending within 24 hours
        const flash = discounts.find((d) => {
          if (!d.endDate) return false;
          const end = new Date(d.endDate).getTime();
          return end - now > 0 && end - now <= 24 * 60 * 60 * 1000;
        });
        if (flash?.endDate) setEndDate(flash.endDate);
      } catch (e) {
        // silently ignore
      }
    }
    fetchFlashSale();
  }, []);

  if (!endDate) return null;
  return <ProductFlashSaleBadge endDate={endDate} className="animate-pulse" />;
}

function ProductDetails({ product, variations = [] }: { product: Product, variations?: Product[] }) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [isVideoSelected, setIsVideoSelected] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [whatsappNumber, setWhatsappNumber] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [optionError, setOptionError] = useState(false);
  const [stitchingSelection, setStitchingSelection] = useState<StitchingUpdate>({
    price: null,
    profileId: null,
    profileName: null,
  });
  const [preferredMeasurementProfileId, setPreferredMeasurementProfileId] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);
  const router = useRouter();
  const { addItem } = useCartStore();
  const { toggleItem, isInWishlist, isIdentityResolved } = useWishlistStore();
  const activeVariants = getActiveVariants(product);
  const selectedVariant = activeVariants.find((variant) => variant.id === selectedVariantId) ?? null;
  const usesColorVariants = isUnstitchedColorVariantProduct(product) ||
    getProductOptions(product).some((option) => option.type === "COLOR" || option.type === "SHADE");
  const defaultColorVariantId = usesColorVariants
    ? activeVariants.find(isVariantAvailable)?.id || null
    : null;
  const selectedGallery = selectedVariant ? getVariantImages(product, selectedVariant) : product.images;
  const productImages = selectedGallery.length > 0
    ? selectedGallery
    : [getProductImage(product.images)];
  const selectionRequired = requiresVariantSelectionForPurchase(product);
  const hasOptions = Boolean(product.commerce && (activeVariants.length > 0 || selectionRequired));
  const requiredSelectionUnavailable = hasUnavailableRequiredSelection(product);
  const productAvailable = isProductAvailableForPurchase(product);
  const displayedPrice = getVariantUnitPrice(product, selectedVariant);
  const displayedOriginalPrice = product.originalPrice
    ? product.originalPrice + (selectedVariant?.priceAdjustment ?? 0)
    : undefined;
  // Missing metadata deliberately preserves the existing fabric behaviour.
  const supportsStitching = isProductStitchingEligible(product);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSelectedImage(0);
    setIsVideoSelected(false);
    setIsZoomed(false);
    setSelectedVariantId(defaultColorVariantId);
    setOptionError(false);
    setStitchingSelection({ price: null, profileId: null, profileName: null });
    setPreferredMeasurementProfileId(null);
  }, [product.id, defaultColorVariantId]);

  useEffect(() => {
    if (!supportsStitching || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const returnedProfileId = params.get("measurementProfileId");
    if (!returnedProfileId) return;

    try {
      const draft = window.sessionStorage.getItem(`stitching-product-draft:${product.id}`);
      if (draft) {
        const parsed = JSON.parse(draft) as { variantId?: string | null; quantity?: number };
        if (
          parsed.variantId &&
          activeVariants.some((variant) => variant.id === parsed.variantId && isVariantAvailable(variant))
        ) {
          setSelectedVariantId(parsed.variantId);
        }
        if (Number.isInteger(parsed.quantity) && (parsed.quantity ?? 0) > 0) {
          setQuantity(parsed.quantity!);
        }
        window.sessionStorage.removeItem(`stitching-product-draft:${product.id}`);
      }
    } catch {
      window.sessionStorage.removeItem(`stitching-product-draft:${product.id}`);
    }

    setPreferredMeasurementProfileId(returnedProfileId);
    params.delete("measurementProfileId");
    const cleanUrl = `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", cleanUrl);
  }, [activeVariants, product.id, supportsStitching]);

  const handleStitchingChange = useCallback((selection: StitchingUpdate) => {
    setStitchingSelection(selection);
    setPreferredMeasurementProfileId(null);
  }, []);

  const handleCreateMeasurements = useCallback(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(
      `stitching-product-draft:${product.id}`,
      JSON.stringify({ variantId: selectedVariantId, quantity }),
    );
    const returnTo = window.location.pathname;
    router.push(`/account/measurements?create=1&returnTo=${encodeURIComponent(returnTo)}`);
  }, [product.id, quantity, router, selectedVariantId]);

  const handleMeasurementSignIn = useCallback(() => {
    if (typeof window === "undefined") return;
    const callbackUrl = `${window.location.pathname}${window.location.search}`;
    router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }, [router]);

  const wishlistReady = mounted && isIdentityResolved;
  const inWishlist = wishlistReady && isInWishlist(product.id);

  useEffect(() => {
    let cancelled = false;
    fetchWhatsAppNumber().then((num) => {
      if (!cancelled) setWhatsappNumber(num);
    });
    return () => { cancelled = true; };
  }, []);
  const addConfiguredItem = () => {
    if (!productAvailable) return false;

    if (selectionRequired && (!selectedVariant || !isVariantAvailable(selectedVariant))) {
      setOptionError(true);
      return false;
    }

    const selection: CartSelection | undefined = selectedVariant
      ? {
          variant: {
            id: selectedVariant.id,
            label: selectedVariant.label,
            sku: selectedVariant.sku,
            priceAdjustment: selectedVariant.priceAdjustment,
          },
          selectedOptions: productOptionsForVariant(product, selectedVariant),
          unitPrice: displayedPrice,
        }
      : undefined;
    addItem(product, quantity, supportsStitching ? stitchingSelection : undefined, selection);
    setQuantity(1);
    return true;
  };

  const handleAddToCart = () => {
    addConfiguredItem();
  };

  const handleBuyNow = () => {
    if (addConfiguredItem()) {
      router.push("/checkout");
    }
  };

  const handleWhatsAppShare = async () => {
    let phone = whatsappNumber;
    if (!phone) {
      phone = await fetchWhatsAppNumber();
      setWhatsappNumber(phone);
    }
    if (!phone) return;

    const productUrl = typeof window !== "undefined" ? window.location.href : "";
    const message = `Hi! Check out this product from Emaan Thread:\n\n*${product.name}*\n${product.fabricType} — ${formatPrice(product.price)}\n\n${productUrl}`;
    window.open(buildWhatsAppUrl(phone, message), "_blank");
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  const showGalleryImage = (direction: -1 | 1) => {
    setSelectedImage((current) => (
      (current + direction + productImages.length) % productImages.length
    ));
    setIsVideoSelected(false);
    setIsZoomed(false);
  };

  const handleGalleryPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" && !isVideoSelected && !(event.target as HTMLElement).closest("button")) {
      touchStartX.current = event.clientX;
    }
  };

  const handleGalleryPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || touchStartX.current === null) return;

    const distance = event.clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < 36 || productImages.length < 2) return;

    showGalleryImage(distance > 0 ? -1 : 1);
  };

  const badgeVariants: Record<string, string> = {
    New: "bg-emerald-600 text-white",
    Trending: "bg-accent text-accent-foreground",
    Hot: "bg-red-600 text-white",
    Limited: "bg-primary text-primary-foreground",
    Featured: "bg-purple-600 text-white",
  };

  const colorSelectionBlock = usesColorVariants ? (
    <ProductOptionPicker
      product={product}
      selectedVariantId={selectedVariantId}
      onSelect={(variant: ProductVariant) => {
        setSelectedVariantId(variant.id);
        setSelectedImage(0);
        setIsVideoSelected(false);
        setIsZoomed(false);
        setOptionError(false);
      }}
      invalid={optionError}
    />
  ) : (
    <div>
      <p className="text-sm font-medium mb-3">
        Color: <span className="font-normal">{product.color}</span>
      </p>
      <div className="flex flex-wrap gap-3">
        {variations.length > 0 ? (
          variations.map((variant) => (
            <Link
              key={variant.id}
              href={`/product/${variant.id}`}
              className={cn(
                "w-10 h-10 rounded-full border-2 transition-all block",
                variant.id === product.id
                  ? "border-accent ring-2 ring-accent/20 ring-offset-2"
                  : "border-border hover:scale-110"
              )}
              style={{ backgroundColor: variant.colorHex }}
              title={variant.color}
            />
          ))
        ) : (
          <div
            className="w-10 h-10 rounded-full border-2 border-border block"
            style={{ backgroundColor: product.colorHex }}
            title={product.color}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
      {/* Image Gallery */}
      <div className="space-y-4">
        <div
          className="group relative aspect-[2/3] touch-pan-y bg-secondary overflow-hidden rounded-2xl shadow-lg cursor-zoom-in"
          onMouseEnter={() => !isVideoSelected && setIsZoomed(true)}
          onMouseLeave={() => setIsZoomed(false)}
          onMouseMove={handleMouseMove}
          onPointerDown={handleGalleryPointerDown}
          onPointerUp={handleGalleryPointerEnd}
          onPointerCancel={() => {
            touchStartX.current = null;
          }}
        >
          {isVideoSelected && product.videoUrl ? (
            <video
              src={product.videoUrl}
              controls
              className="h-full w-full object-cover"
              poster={getProductImage(product.images)}
            />
          ) : (
            <Image
              src={productImages[selectedImage]}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className={cn(
                "object-cover transition-transform duration-200",
                isZoomed && "scale-150"
              )}
              style={
                isZoomed
                  ? { transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` }
                  : undefined
              }
            />
          )}
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
          {productImages.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Show previous product image"
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/90 p-2 text-foreground opacity-100 shadow-sm backdrop-blur-sm transition hover:bg-background lg:opacity-0 lg:group-hover:opacity-100"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  showGalleryImage(-1);
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Show next product image"
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/90 p-2 text-foreground opacity-100 shadow-sm backdrop-blur-sm transition hover:bg-background lg:opacity-0 lg:group-hover:opacity-100"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  showGalleryImage(1);
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="sr-only" aria-live="polite">
                Image {selectedImage + 1} of {productImages.length}
              </span>
            </>
          )}
        </div>

        <div className="flex gap-3">
          {productImages.map((image, index) => (
            <button
              key={index}
              onClick={() => {
                setSelectedImage(index);
                setIsVideoSelected(false);
              }}
              className={cn(
                "relative w-20 h-24 bg-secondary overflow-hidden rounded-xl border-2 transition-all",
                selectedImage === index && !isVideoSelected
                  ? "border-accent shadow-md"
                  : "border-transparent hover:border-border"
              )}
            >
              <Image
                src={image}
                alt={`${product.name} - View ${index + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
          {product.videoUrl && (
            <button
              onClick={() => setIsVideoSelected(true)}
              className={cn(
                "relative w-20 h-24 bg-secondary overflow-hidden rounded-xl border-2 transition-all flex items-center justify-center",
                isVideoSelected
                  ? "border-accent shadow-md"
                  : "border-transparent hover:border-border"
              )}
            >
              <div className="relative h-full w-full">
                <Image
                  src={getProductImage(product.images)}
                  alt={`${product.name} - Video`}
                  fill
                  sizes="80px"
                  className="object-cover opacity-70"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8 rounded-full bg-black/60 flex items-center justify-center">
                    <Play className="h-4 w-4 text-white fill-white" />
                  </div>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground tracking-wider uppercase">
              {product.fabricType}
            </p>
            <p className="text-sm text-muted-foreground">Code: {product.sku}</p>
          </div>

          <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">
            {product.name}
          </h1>
          <div>
            {colorSelectionBlock}
          </div>
          <ProductDetailFlashSale />
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold">{formatPrice(displayedPrice)}</span>
            {displayedOriginalPrice && (
              <>
                <span className="text-xl text-muted-foreground line-through">
                  {formatPrice(displayedOriginalPrice)}
                </span>
                <Badge variant="secondary" className="text-emerald-600">
                  {Math.round(((displayedOriginalPrice - displayedPrice) / displayedOriginalPrice) * 100)}% Off
                </Badge>
              </>
            )}
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {product.description}
          </p>
          {hasOptions && !usesColorVariants && (
            <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
              {requiredSelectionUnavailable ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
                  No {product.commerce?.optionLabel?.trim() || "options"} are available right now. This item cannot be ordered until one is restocked.
                </div>
              ) : (
                <ProductOptionPicker
                  product={product}
                  selectedVariantId={selectedVariantId}
                  onSelect={(variant: ProductVariant) => {
                    setSelectedVariantId(variant.id);
                    setOptionError(false);
                  }}
                  invalid={optionError}
                  guideAction={<SizeGuideModal product={product} />}
                />
              )}
            </div>
          )}
          {supportsStitching && (
            <StitchingProfileSelector
              selectedProfileId={stitchingSelection.profileId}
              preferredProfileId={preferredMeasurementProfileId}
              quantity={quantity}
              onChange={handleStitchingChange}
              onCreateNew={handleCreateMeasurements}
              onSignIn={handleMeasurementSignIn}
            />
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center border border-border rounded">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-4 hover:bg-secondary transition-colors"
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="px-6 text-base font-medium min-w-[60px] text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-4 hover:bg-secondary transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button 
              size="lg" 
              className={cn(
                "flex-1 transition-all",
                !productAvailable && "disabled:opacity-100 disabled:bg-destructive disabled:text-destructive-foreground"
              )} 
              onClick={handleAddToCart} 
              disabled={!productAvailable}
            >
              {productAvailable && <Plus className="h-4 w-4 mr-2" />}
              {requiredSelectionUnavailable ? "Option Unavailable" : productAvailable ? "Add to Cart" : "Out of Stock"}
            </Button>
            <Button size="lg" variant="secondary" className="flex-1" onClick={handleBuyNow} disabled={!productAvailable}>
              Buy Now - {formatPrice(displayedPrice * quantity)}
            </Button>
          </div>
          <div className="flex gap-4">
            <Button
              variant="outline"
              className={cn("flex-1", !wishlistReady && "invisible")}
              disabled={!wishlistReady}
              aria-hidden={!wishlistReady}
              onClick={() => toggleItem(product)}
            >
              <Heart className={cn("h-4 w-4 mr-2", inWishlist && "fill-red-500 text-red-500")} />
              {inWishlist ? "Saved to Wishlist" : "Add to Wishlist"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleWhatsAppShare}
              className="border-[#25D366]/50 text-[#25D366] hover:bg-[#25D366]/10 hover:border-[#25D366]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
              <span className="sr-only">Share on WhatsApp</span>
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
            <div className="text-center">
              <Truck className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Free Shipping</p>
              <p className="text-xs text-muted-foreground">Over PKR 5,000</p>
            </div>
            <div className="text-center">
              <RotateCcw className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Easy Returns</p>
              <p className="text-xs text-muted-foreground">7 Days Policy</p>
            </div>
            <div className="text-center">
              <Shield className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Secure Payment</p>
              <p className="text-xs text-muted-foreground">100% Protected</p>
            </div>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="description">
              <AccordionTrigger className="text-sm font-medium">
                Product Description
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {product.longDescription}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="care">
              <AccordionTrigger className="text-sm font-medium">
                Care Instructions
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                <ul className="list-disc list-inside space-y-1">
                  <li>Machine wash cold with like colors</li>
                  <li>Do not bleach</li>
                  <li>Tumble dry low</li>
                  <li>Iron on medium heat if needed</li>
                  <li>Do not dry clean</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="shipping">
              <AccordionTrigger className="text-sm font-medium">
                Shipping & Returns
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                <p className="mb-2">
                  <strong>Shipping:</strong> Free standard shipping on orders over PKR 5,000. Express shipping available at checkout.
                </p>
                <p>
                  <strong>Returns:</strong> We accept returns within 7 days of delivery. Items must be unwashed and in original packaging.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

    </div>
  );
}
