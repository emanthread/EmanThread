"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/product-card";
import { type Product } from "@/lib/data";
import { cn } from "@/lib/utils";

export function TrendingSection({ products }: { products: Product[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const trendingProducts = products.filter(
    (p) => p.badge === "Trending" || p.badge === "Hot"
  );

  const checkScrollability = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollability();
    window.addEventListener("resize", checkScrollability);
    return () => window.removeEventListener("resize", checkScrollability);
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScrollability, 300);
    }
  };

  return (
    <section className="py-20 lg:py-28 bg-secondary/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-sm tracking-[0.3em] uppercase text-muted-foreground mb-3">
              Most Popular
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold">
              Trending Products
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                className={cn(!canScrollLeft && "opacity-50")}
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="sr-only">Previous</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                className={cn(!canScrollRight && "opacity-50")}
              >
                <ChevronRight className="h-5 w-5" />
                <span className="sr-only">Next</span>
              </Button>
            </div>
            <Button
              variant="outline"
              asChild
              className="group bg-background text-foreground border-border shadow-sm hover:bg-primary hover:text-primary-foreground hover:border-primary"
            >
              <Link href="/shop?sort=trending">
                View All
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Products Carousel */}
        <div
          ref={scrollRef}
          onScroll={checkScrollability}
          className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {trendingProducts.map((product) => (
            <div
              key={`trending-${product.id}`}
              className="min-w-[280px] sm:min-w-[300px] snap-start"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
