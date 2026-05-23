"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface PromoStat {
  value: string;
  label: string;
}

interface PromoData {
  image: string;
  subtitle: string;
  title: string;
  description: string;
  stats: PromoStat[];
  cta: string;
  link: string;
}

const DEFAULT_PROMO: PromoData = {
  image: "/images/fabrics/promo_1776582682565.png",
  subtitle: "Limited Time Offer",
  title: "Summer Collection Sale",
  description:
    "Enjoy up to 30% off on our exclusive summer collection. Premium fabrics, unmatched quality - now at exceptional prices. Don't miss this opportunity to elevate your wardrobe.",
  stats: [
    { value: "30%", label: "Off Selected Items" },
    { value: "Free", label: "Shipping Over PKR 5,000" },
  ],
  cta: "Shop the Sale",
  link: "/shop?sale=true",
};

export function PromoSection() {
  const [promo, setPromo] = useState<PromoData>(DEFAULT_PROMO);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/promo-banner")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        if (data && typeof data === "object" && data.image && data.title) {
          setPromo(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load promo banner:", err);
      })
      .finally(() => {
        setLoaded(true);
      });
  }, []);

  if (!loaded) {
    return (
      <section className="py-20 lg:py-28 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="h-4 w-32 bg-primary-foreground/20 rounded animate-pulse mb-4" />
              <div className="h-10 w-72 bg-primary-foreground/20 rounded animate-pulse mb-6" />
              <div className="h-16 w-full bg-primary-foreground/20 rounded animate-pulse mb-6" />
              <div className="h-8 w-40 bg-primary-foreground/20 rounded animate-pulse" />
            </div>
            <div className="order-1 lg:order-2">
              <div className="aspect-[3/4] lg:aspect-[2/3] bg-primary-foreground/20 rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 lg:py-28 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="order-2 lg:order-1">
            <p className="text-sm tracking-[0.3em] uppercase text-primary-foreground/70 mb-4">
              {promo.subtitle}
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight text-balance">
              {promo.title}
            </h2>
            <p className="mt-6 text-lg text-primary-foreground/80 leading-relaxed">
              {promo.description}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-6">
              {promo.stats.flatMap((stat, index) => {
                const elements: React.ReactNode[] = [
                  <div key={`stat-${index}`}>
                    <p className="text-4xl font-bold">{stat.value}</p>
                    <p className="text-sm text-primary-foreground/70 uppercase tracking-wider">
                      {stat.label}
                    </p>
                  </div>,
                ];
                if (index < promo.stats.length - 1) {
                  elements.push(
                    <div key={`divider-${index}`} className="hidden sm:block w-px bg-primary-foreground/20" />
                  );
                }
                return elements;
              })}
            </div>

            <div className="mt-10">
              <Button
                size="lg"
                variant="secondary"
                asChild
                className="group"
              >
                <Link href={promo.link}>
                  {promo.cta}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Image */}
          <div className="order-1 lg:order-2">
            <div className="relative aspect-[3/4] lg:aspect-[2/3] overflow-hidden rounded-2xl shadow-xl">
              <Image
                src={promo.image}
                alt={promo.title}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              {/* Decorative Frame */}
              <div className="absolute inset-4 border border-primary-foreground/20 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}