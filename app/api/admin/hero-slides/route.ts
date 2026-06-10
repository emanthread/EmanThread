import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from '@/lib/utils/errors';

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

const DEFAULT_PROMO_BANNER = {
  image: "/images/fabrics/promo_1776582682565.png",
  subtitle: "Limited Time Offer",
  title: "Summer Collection Sale",
  description:
    "Enjoy up to 30% off on our exclusive summer collection. Premium fabrics, unmatched quality - now at exceptional prices. Don\u2019t miss this opportunity to elevate your wardrobe.",
  stats: [
    { value: "30%", label: "Off Selected Items" },
    { value: "Free", label: "Shipping Over PKR 5,000" },
  ],
  cta: "Shop the Sale",
  link: "/shop?sale=true",
};

async function checkAdmin() {
  const session = await auth();
  if (
    !session?.user ||
    !["ADMIN", "SUPER_ADMIN"].includes(session.user.role ?? "")
  ) {
    return false;
  }
  return true;
}

export const GET = withLoggedAdminHandler(async () => {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch hero slides
    const slidesRow = await prisma.storeConfig.findUnique({
      where: { key: "hero_slides" },
    });
    let slides = DEFAULT_SLIDES;
    if (slidesRow) {
      try {
        const parsed = JSON.parse(slidesRow.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          slides = parsed;
        }
      } catch {}
    }

    // Fetch promo banner
    const promoRow = await prisma.storeConfig.findUnique({
      where: { key: "promo_banner" },
    });
    let promoBanner = DEFAULT_PROMO_BANNER;
    if (promoRow) {
      try {
        const parsed = JSON.parse(promoRow.value);
        if (parsed && typeof parsed === "object") {
          promoBanner = parsed;
        }
      } catch {}
    }

    return NextResponse.json({ slides, promoBanner });
  } catch (error) {
    console.error("Get hero slides error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});

export const PUT = withLoggedAdminHandler(async (req: Request) => {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Handle hero slides update
    if (body.slides) {
      if (!Array.isArray(body.slides)) {
        return NextResponse.json(
          { error: "slides must be an array" },
          { status: 400 }
        );
      }
      for (let i = 0; i < body.slides.length; i++) {
        const slide = body.slides[i];
        if (
          !slide.image ||
          !slide.title ||
          !slide.subtitle ||
          !slide.description ||
          !slide.cta ||
          !slide.link
        ) {
          return NextResponse.json(
            { error: `Slide ${i + 1} is missing required fields` },
            { status: 400 }
          );
        }
      }
      await prisma.storeConfig.upsert({
        where: { key: "hero_slides" },
        create: { key: "hero_slides", value: JSON.stringify(body.slides) },
        update: { value: JSON.stringify(body.slides) },
      });
    }

    // Handle promo banner update
    if (body.promoBanner) {
      const pb = body.promoBanner;
      if (!pb.image || !pb.title || !pb.subtitle || !pb.description || !pb.cta || !pb.link) {
        return NextResponse.json(
          { error: "Promo banner is missing required fields" },
          { status: 400 }
        );
      }
      await prisma.storeConfig.upsert({
        where: { key: "promo_banner" },
        create: { key: "promo_banner", value: JSON.stringify(pb) },
        update: { value: JSON.stringify(pb) },
      });
    }

    // Return updated data
    const slidesRow = await prisma.storeConfig.findUnique({
      where: { key: "hero_slides" },
    });
    let slides = DEFAULT_SLIDES;
    if (slidesRow) {
      try {
        const parsed = JSON.parse(slidesRow.value);
        if (Array.isArray(parsed) && parsed.length > 0) slides = parsed;
      } catch {}
    }

    const promoRow = await prisma.storeConfig.findUnique({
      where: { key: "promo_banner" },
    });
    let promoBanner = DEFAULT_PROMO_BANNER;
    if (promoRow) {
      try {
        const parsed = JSON.parse(promoRow.value);
        if (parsed && typeof parsed === "object") promoBanner = parsed;
      } catch {}
    }

    return NextResponse.json({ slides, promoBanner });
  } catch (error) {
    console.error("Update hero slides error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});