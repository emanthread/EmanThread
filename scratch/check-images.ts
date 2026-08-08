/**
 * Diagnostic: Check hero slides or any existing image URLs in use
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Check hero slides
  const heroConfig = await prisma.storeConfig.findFirst({
    where: { key: "hero_slides" },
    select: { value: true },
  });
  
  if (heroConfig) {
    console.log("Hero slides config:");
    const slides = JSON.parse(heroConfig.value as string);
    if (Array.isArray(slides)) {
      for (const slide of slides.slice(0, 3)) {
        console.log(`  image: ${slide.image || slide.imageUrl || slide.src || "(none)"}`);
      }
    } else {
      console.log("  Raw:", JSON.stringify(slides).substring(0, 200));
    }
  } else {
    console.log("No hero_slides config found");
  }

  // Check if any CatalogNode has a bannerImage set (to find working examples)
  const nodesWithBanner = await prisma.catalogNode.findMany({
    where: { bannerImage: { not: null } },
    select: { path: true, bannerImage: true, bannerAlt: true },
    take: 5,
  });
  
  console.log(`\nCatalogNodes with bannerImage set: ${nodesWithBanner.length}`);
  for (const n of nodesWithBanner) {
    console.log(`  path: ${n.path}, banner: ${n.bannerImage}`);
  }

  // Check sample product images to find valid Cloudinary URLs
  const sampleProducts = await prisma.product.findMany({
    where: { images: { not: "" } },
    select: { name: true, images: true },
    take: 3,
  });
  
  console.log("\nSample product image URLs:");
  for (const p of sampleProducts) {
    const firstImage = (p.images as string).split(",")[0]?.trim();
    console.log(`  ${p.name}: ${firstImage?.substring(0, 100)}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
