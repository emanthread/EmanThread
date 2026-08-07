import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  parseHeroSlidesJson,
  validateHeroSlides,
} from "@/lib/db/store-config";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from '@/lib/utils/errors';
import { revalidatePath, revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

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
  link: "/women/sale",
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
    const slides = parseHeroSlidesJson(slidesRow?.value);

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
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    let heroSlidesUpdated = false;
    let homeContentUpdated = false;

    // Handle hero slides update
    if (body.slides !== undefined) {
      const validation = validateHeroSlides(body.slides);
      if (!validation.slides) {
        return NextResponse.json(
          { error: validation.error || "Invalid hero slides" },
          { status: 400 }
        );
      }
      await prisma.storeConfig.upsert({
        where: { key: "hero_slides" },
        create: { key: "hero_slides", value: JSON.stringify(validation.slides) },
        update: { value: JSON.stringify(validation.slides) },
      });
      heroSlidesUpdated = true;
      homeContentUpdated = true;
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
      homeContentUpdated = true;
    }

    if (heroSlidesUpdated) {
      // Expire the data cache immediately so both the page and public API use
      // the newly saved slide set on their next request.
      revalidateTag("hero-slides", { expire: 0 });
      revalidatePath("/api/hero-slides");
    }
    if (homeContentUpdated) {
      revalidatePath("/", "page");
    }

    // Return updated data
    const slidesRow = await prisma.storeConfig.findUnique({
      where: { key: "hero_slides" },
    });
    const slides = parseHeroSlidesJson(slidesRow?.value);

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
