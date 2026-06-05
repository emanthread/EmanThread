"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { type Category } from "@/lib/data";
import { cn } from "@/lib/utils";

export function CategoriesSection({ categories }: { categories: Category[] }) {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-14">
          <p className="text-sm tracking-[0.3em] uppercase text-muted-foreground mb-3">
            Our Collections
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold text-balance">
            Shop by Category
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Explore our curated selection of premium fabrics, each crafted with
            exceptional attention to quality and detail.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.slice(0, 3).map((category, index) => (
            <Link
              key={category.id}
              href={`/shop?category=${category.id}`}
              className={cn(
                "group relative overflow-hidden bg-secondary rounded-2xl shadow-md transition-all duration-500 hover:shadow-xl hover:scale-[1.015] hover:-translate-y-1",
                index === 0 ? "sm:col-span-2 lg:col-span-1 lg:row-span-2" : ""
              )}
            >
              <div
                className={cn(
                  "relative",
                  index === 0
                    ? "aspect-[5/4] sm:aspect-[2/1] lg:aspect-auto lg:h-full lg:min-h-[500px]"
                    : "aspect-[5/4]"
                )}
              >
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  sizes={index === 0
                    ? "(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 33vw"
                    : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  }
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />

                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end">

                  <h3 className="text-2xl font-semibold text-primary-foreground">
                    {category.name}
                  </h3>
                  <p className="text-sm text-primary-foreground/80 mt-1 max-w-xs">
                    {category.description}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-primary-foreground group-hover:text-accent transition-colors">
                    <span className="text-sm font-medium">Shop Now</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {/* Bottom Row - Remaining Categories */}
          {categories.slice(3).map((category) => (
            <Link
              key={category.id}
              href={`/shop?category=${category.id}`}
              className="group relative overflow-hidden bg-secondary rounded-2xl shadow-md transition-all duration-500 hover:shadow-xl hover:scale-[1.015] hover:-translate-y-1"
            >
              <div className="relative aspect-[5/4]">
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />

                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end">

                  <h3 className="text-2xl font-semibold text-primary-foreground">
                    {category.name}
                  </h3>
                  <p className="text-sm text-primary-foreground/80 mt-1 max-w-xs">
                    {category.description}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-primary-foreground group-hover:text-accent transition-colors">
                    <span className="text-sm font-medium">Shop Now</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
