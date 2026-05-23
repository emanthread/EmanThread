import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_SLIDES = [
  {
    image: "/images/fabrics/hero_banner_1_1776582592087.png",
    title: "The Art of Fine Fabric",
    subtitle: "Summer Collection 2026",
    description:
      "Discover our curated selection of premium unstitched fabrics, crafted for the distinguished gentleman.",
    cta: "Shop Collection",
    link: "/shop",
  },
  {
    image: "/images/fabrics/hero_boski_1776582616605.png",
    title: "Timeless Elegance",
    subtitle: "Premium Boski",
    description:
      "Experience the luxurious silk-cotton blend that defines sophistication.",
    cta: "Explore Boski",
    link: "/shop?category=boski",
  },
  {
    image: "/images/fabrics/hero_wash_1776582631696.png",
    title: "Comfort Meets Style",
    subtitle: "Wash & Wear",
    description:
      "Effortless elegance with easy care - perfect for the modern lifestyle.",
    cta: "Shop Now",
    link: "/shop?category=wash-wear",
  },
];

export async function GET() {
  try {
    const row = await prisma.storeConfig.findUnique({
      where: { key: "hero_slides" },
    });

    if (!row) {
      return NextResponse.json(DEFAULT_SLIDES);
    }

    try {
      const slides = JSON.parse(row.value);
      // Ensure it's an array with valid slides
      if (Array.isArray(slides) && slides.length > 0) {
        return NextResponse.json(slides);
      }
      return NextResponse.json(DEFAULT_SLIDES);
    } catch {
      return NextResponse.json(DEFAULT_SLIDES);
    }
  } catch (error) {
    console.error("Get hero slides error:", error);
    return NextResponse.json(DEFAULT_SLIDES);
  }
}