"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/cart-store";
import { formatPrice, type Product } from "@/lib/data";
import { cn } from "@/lib/utils";

interface QuickViewModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewModal({
  product,
  isOpen,
  onClose,
}: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const { addItem } = useCartStore();

  const handleAddToCart = () => {
    addItem(product, quantity);
    setQuantity(1);
    onClose();
  };

  const badgeVariants: Record<string, string> = {
    New: "bg-emerald-600 text-white",
    Trending: "bg-accent text-accent-foreground",
    Hot: "bg-red-600 text-white",
    Limited: "bg-primary text-primary-foreground",
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 z-50 m-auto max-w-4xl max-h-[90vh] bg-background rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 flex flex-col md:flex-row">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 bg-background/80 hover:bg-background backdrop-blur-sm rounded-full"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </Button>

        {/* Image Section */}
        <div className="relative w-full md:w-1/2 aspect-[4/5] md:aspect-auto bg-secondary rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none overflow-hidden">
          <Image
            src={product.images[selectedImage]}
            alt={product.name}
            fill
            className="object-cover"
          />

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

          {/* Thumbnail Navigation */}
          {product.images.length > 1 && (
            <div className="absolute bottom-4 left-4 right-4 flex gap-2 justify-center">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={cn(
                    "w-16 h-16 rounded-xl border-2 overflow-hidden transition-all",
                    selectedImage === index
                      ? "border-accent shadow-md"
                      : "border-transparent opacity-70 hover:opacity-100"
                  )}
                >
                  <Image
                    src={image}
                    alt={`${product.name} - View ${index + 1}`}
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="w-full md:w-1/2 p-6 md:p-8 overflow-y-auto flex flex-col">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground tracking-wider uppercase mb-2">
              {product.fabricType}
            </p>
            <h2 className="text-2xl font-semibold leading-tight">
              {product.name}
            </h2>

            <div className="flex items-center gap-3 mt-4">
              <span className="text-2xl font-bold">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>

            <p className="text-muted-foreground mt-4 leading-relaxed">
              {product.description}
            </p>

            {/* Color */}
            <div className="mt-6">
              <p className="text-sm font-medium mb-2">Color: {product.color}</p>
              <div
                className="w-8 h-8 rounded-full border border-border"
                style={{ backgroundColor: product.colorHex }}
              />
            </div>

            {/* Quantity */}
            <div className="mt-6">
              <p className="text-sm font-medium mb-2">Quantity</p>
              <div className="flex items-center border border-border rounded w-fit">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 hover:bg-secondary transition-colors"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-6 text-base font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 hover:bg-secondary transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <Button size="lg" className="w-full" onClick={handleAddToCart}>
              Add to Cart - {formatPrice(product.price * quantity)}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              asChild
              onClick={onClose}
            >
              <Link href={`/product/${product.id}`}>View Full Details</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
