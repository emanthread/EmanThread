"use client";

import { Crown, ShieldCheck, Sparkles, Truck } from "lucide-react";

const highlights = [
  {
    icon: Crown,
    title: "Curated Luxury",
    description: "Handpicked seasonal collections designed for a premium wardrobe.",
  },
  {
    icon: ShieldCheck,
    title: "Quality Assured",
    description: "Each fabric is verified for finish, color integrity, and comfort.",
  },
  {
    icon: Truck,
    title: "Fast Nationwide Delivery",
    description: "Secure shipping across Pakistan with careful packaging standards.",
  },
  {
    icon: Sparkles,
    title: "Personal Styling Help",
    description: "Get quick recommendations for occasion, season, and color pairing.",
  },
];

export function LuxuryHighlightsSection() {
  return (
    <section className="py-10 border-y border-border/70 bg-gradient-to-b from-background to-secondary/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-border/60 bg-background/90 p-5 shadow-sm"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
