/**
 * Seed department root CatalogNode banner data.
 * 
 * This script populates the bannerImage, bannerAlt, and description fields
 * for the four department root nodes. It only updates these three fields and
 * does NOT change any other node configuration.
 * 
 * Run: npx tsx scripts/seed-department-banners.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface DepartmentBanner {
  path: string;
  bannerImage: string;
  bannerAlt: string;
  description: string;
}

const departmentBanners: DepartmentBanner[] = [
  {
    path: "/women",
    bannerImage: "/images/banners/women.png",
    bannerAlt: "Women's luxury fashion collection by Eman Thread",
    description:
      "Discover timeless elegance in our Women's collection — curated fabrics, modern silhouettes, and luxurious finishes designed to make every occasion unforgettable.",
  },
  {
    path: "/men",
    bannerImage: "/images/banners/men.png",
    bannerAlt: "Men's premium fashion collection by Eman Thread",
    description:
      "Refined menswear crafted from premium fabrics — tailored suits, casual essentials, and statement pieces for the modern gentleman.",
  },
  {
    path: "/teens",
    bannerImage: "/images/banners/teens.png",
    bannerAlt: "Teens trendy fashion collection by Eman Thread",
    description:
      "Fresh styles for the next generation — vibrant colours, comfortable fits, and on-trend designs that let your personality shine.",
  },
  {
    path: "/fragrance-beauty",
    bannerImage: "/images/banners/fragrance-beauty.png",
    bannerAlt: "Fragrance and beauty collection by Eman Thread",
    description:
      "Indulge in luxury fragrances and beauty essentials — signature scents and premium cosmetics to complete your look.",
  },
];

async function main() {
  for (const dept of departmentBanners) {
    const result = await prisma.catalogNode.updateMany({
      where: { path: dept.path },
      data: {
        bannerImage: dept.bannerImage,
        bannerAlt: dept.bannerAlt,
        description: dept.description,
      },
    });

    if (result.count === 0) {
      console.log(`⚠️  No CatalogNode found for path: ${dept.path} — skipped`);
    } else {
      console.log(`✅ Updated ${dept.path} — bannerImage, bannerAlt, description set`);
    }
  }

  // Verify
  console.log("\n── Verification ──");
  for (const dept of departmentBanners) {
    const node = await prisma.catalogNode.findFirst({
      where: { path: dept.path },
      select: {
        path: true,
        bannerImage: true,
        bannerAlt: true,
        description: true,
      },
    });
    if (node) {
      console.log(`  ${node.path}`);
      console.log(`    bannerImage: ${node.bannerImage}`);
      console.log(`    bannerAlt:   ${node.bannerAlt}`);
      console.log(`    description: ${node.description?.substring(0, 60)}...`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
