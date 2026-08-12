"use client";

import { ExternalLink, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SizeGuideTemplateImage } from "@/components/size-guide/size-guide-template";
import type { Product } from "@/lib/data";
import {
  hasProductSizeGuide,
  isImageSizeGuideUrl,
  KIDS_SIZE_GUIDE_URL,
  resolveProductSizeGuideUrl,
  resolveProductSizeGuideTemplates,
} from "@/lib/size-guide";

export function SizeGuideModal({ product }: { product: Product }) {
  const guideUrl = resolveProductSizeGuideUrl(product);
  const usesKidsGuide = guideUrl === KIDS_SIZE_GUIDE_URL;
  const templateKeys = resolveProductSizeGuideTemplates(product);

  if (!hasProductSizeGuide(product)) return null;

  if (usesKidsGuide) {
    return (
      <Button
        type="button"
        variant="link"
        className="h-auto gap-2 px-0 text-sm"
        asChild
      >
        <a href={guideUrl} target="_blank" rel="noopener noreferrer">
          <Ruler className="h-4 w-4" />
          Size Guide
        </a>
      </Button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="link" className="h-auto gap-2 px-0 text-sm">
          <Ruler className="h-4 w-4" />
          Size Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-4xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pr-8">
          <DialogTitle>Size Guide</DialogTitle>
          <DialogDescription>
            {product.name}. Measurements are finished garment measurements unless noted otherwise.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {guideUrl && isImageSizeGuideUrl(guideUrl) ? (
            <figure className="space-y-3">
              {/* A standard image element supports approved external media without
                  requiring broad Next image-host configuration. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={guideUrl}
                alt={`${product.name} size chart`}
                className="h-auto w-full rounded-lg border bg-white"
              />
              <figcaption className="text-sm text-muted-foreground">
                Product-specific size chart.
              </figcaption>
            </figure>
          ) : templateKeys.length > 0 ? (
            <div className="space-y-6">
              {templateKeys.map((templateKey, index) => (
                <SizeGuideTemplateImage
                  key={templateKey}
                  templateKey={templateKey}
                  priority={index === 0}
                />
              ))}
            </div>
          ) : null}

          {guideUrl && !isImageSizeGuideUrl(guideUrl) ? (
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <a href={guideUrl} target="_blank" rel="noopener noreferrer">
                Open product-specific guide
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          ) : null}

          <p className="rounded-md bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
            Compare these measurements with a similar garment laid flat. If you are between sizes, choose the more comfortable fit or contact us before ordering.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
