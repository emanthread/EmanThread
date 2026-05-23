import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/product-card";
import { type Product } from "@/lib/data";

export function NewArrivalsSection({ products }: { products: Product[] }) {
  const newProducts = products.filter((p) => p.badge === "New").slice(0, 4);

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-sm tracking-[0.3em] uppercase text-muted-foreground mb-3">
              Fresh Arrivals
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold">New In Store</h2>
            <p className="mt-3 text-muted-foreground max-w-lg">
              Be the first to discover our latest additions, featuring the
              finest fabrics of the season.
            </p>
          </div>
          <Button variant="outline" asChild className="group shrink-0">
            <Link href="/shop?sort=newest">
              Shop New Arrivals
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {newProducts.map((product) => (
            <ProductCard key={`new-arrival-${product.id}`} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
