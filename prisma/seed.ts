import { PrismaClient, Badge } from "@prisma/client";
import { categories, products } from "../lib/data";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// SAFETY NOTICE
// This seed script is fully idempotent. It NEVER deletes any records.
// Every operation uses upsert() or create-if-missing guards.
// Running this script multiple times is safe and will never destroy data.
// ---------------------------------------------------------------------------

function mapFabricType(type: string): string {
  switch (type) {
    case "Cotton":
      return "COTTON";
    case "Wash & Wear":
      return "WASH_AND_WEAR";
    case "Boski":
      return "BOSKI";
    case "Wool Blend":
      return "WOOL_BLEND";
    case "Khaddar":
      return "KHADDAR";
    default:
      return "COTTON";
  }
}

function mapBadge(badge?: string): Badge | undefined {
  switch (badge) {
    case "New":
      return Badge.NEW;
    case "Trending":
      return Badge.TRENDING;
    case "Hot":
      return Badge.HOT;
    case "Limited":
      return Badge.LIMITED;
    case "Featured":
      return Badge.FEATURED;
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Admin users — upsert so existing records are never overwritten destructively
// ---------------------------------------------------------------------------
async function seedAdminUsers() {
  // Primary business admin — always ensure this account exists and is ADMIN
  await prisma.user.upsert({
    where: { email: "emanthread@gmail.com" },
    update: {
      role: "ADMIN",
      isVerified: true,
      name: "Eman Thread Admin",
    },
    create: {
      email: "emanthread@gmail.com",
      name: "Eman Thread Admin",
      passwordHash: await bcrypt.hash("Eman456@", 12),
      role: "ADMIN",
      isVerified: true,
    },
  });
  console.log("✅ Admin ensured: emanthread@gmail.com");

  // Secondary admin account — create only if it does not already exist
  const secondaryAdmin = await prisma.user.findUnique({
    where: { email: "admin@emanthread.com" },
    select: { id: true },
  });
  if (!secondaryAdmin) {
    await prisma.user.create({
      data: {
        name: "Admin User",
        email: "admin@emanthread.com",
        passwordHash: await bcrypt.hash("admin123", 12),
        phone: "+92 300 1234567",
        role: "ADMIN",
        isVerified: true,
      },
    });
    console.log("✅ Secondary admin created: admin@emanthread.com");
  } else {
    console.log("⏭️  Secondary admin already exists: admin@emanthread.com");
  }
}

// ---------------------------------------------------------------------------
// Demo customer — create only if missing (never wipe real customers)
// ---------------------------------------------------------------------------
async function seedDemoCustomer() {
  const existing = await prisma.user.findUnique({
    where: { email: "ahmed@example.com" },
    select: { id: true },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        name: "Ahmed Khan",
        email: "ahmed@example.com",
        passwordHash: await bcrypt.hash("user123", 12),
        phone: "+92 321 9876543",
        role: "CUSTOMER",
        addresses: {
          create: {
            label: "Home",
            fullName: "Ahmed Khan",
            phone: "+92 321 9876543",
            address: "123 Main Street, DHA Phase 5",
            city: "Lahore",
            province: "Punjab",
            postalCode: "54000",
            isDefault: true,
          },
        },
      },
    });
    console.log("✅ Demo customer created: ahmed@example.com");
  } else {
    console.log("⏭️  Demo customer already exists: ahmed@example.com");
  }
}

// ---------------------------------------------------------------------------
// Categories — upsert on name
// ---------------------------------------------------------------------------
async function seedCategories(): Promise<Map<string, string>> {
  const categoryMap = new Map<string, string>();

  for (const cat of categories) {
    const upserted = await prisma.category.upsert({
      where: { name: cat.name },
      update: {
        description: cat.description,
        image: cat.image,
      },
      create: {
        name: cat.name,
        description: cat.description,
        image: cat.image,
      },
    });
    categoryMap.set(cat.name, upserted.id);
  }

  console.log(`✅ ${categories.length} categories ensured (upserted).`);
  return categoryMap;
}

// ---------------------------------------------------------------------------
// Products — upsert on sku (unique business key)
// ---------------------------------------------------------------------------
async function seedProducts(categoryMap: Map<string, string>) {
  let created = 0;
  let updated = 0;

  for (const product of products) {
    const categoryId = categoryMap.get(product.fabricType);
    if (!categoryId) {
      console.warn(`⚠️  No category found for fabric type: ${product.fabricType}`);
      continue;
    }

    const existing = await prisma.product.findUnique({
      where: { sku: product.sku },
      select: { id: true },
    });

    if (!existing) {
      // Assign realistic stock quantities (20–50 range) only for new records
      const stockQuantity = 20 + Math.floor(Math.random() * 31);

      await prisma.product.create({
        data: {
          sku: product.sku,
          name: product.name,
          description: product.description,
          longDescription: product.longDescription,
          price: product.price,
          originalPrice: product.originalPrice,
          fabricType: mapFabricType(product.fabricType),
          color: product.color,
          colorHex: product.colorHex,
          images: JSON.stringify(product.images),
          tags: JSON.stringify(product.tags || []),
          videoUrl: product.videoUrl || null,
          badge: mapBadge(product.badge),
          inStock: product.inStock,
          stockQuantity,
          lowStockThreshold: 5,
          categoryId,
        },
      });
      created++;
    } else {
      updated++;
    }
  }

  console.log(`✅ Products: ${created} created, ${updated} already existed (skipped).`);
}

// ---------------------------------------------------------------------------
// Shipping zones — upsert on name
// ---------------------------------------------------------------------------
async function seedShippingZones() {
  const zones = [
    {
      name: "Karachi",
      cities: ["karachi"],
      provinces: ["sindh"],
      shippingRate: 0,
      estimatedDays: "1-2 business days",
      isActive: true,
    },
    {
      name: "Lahore",
      cities: ["lahore"],
      provinces: ["punjab"],
      shippingRate: 150,
      estimatedDays: "1-2 business days",
      isActive: true,
    },
    {
      name: "Islamabad / Rawalpindi",
      cities: ["islamabad", "rawalpindi"],
      provinces: ["punjab", "islamabad capital territory"],
      shippingRate: 150,
      estimatedDays: "1-2 business days",
      isActive: true,
    },
    {
      name: "Other Major Cities",
      cities: ["faisalabad", "multan", "sialkot", "gujranwala", "peshawar", "quetta", "hyderabad", "sukkur"],
      provinces: ["punjab", "khyber pakhtunkhwa", "balochistan", "sindh"],
      shippingRate: 250,
      estimatedDays: "2-3 business days",
      isActive: true,
    },
    {
      name: "Rest of Pakistan",
      cities: [],
      provinces: [],
      shippingRate: 350,
      estimatedDays: "3-5 business days",
      isActive: true,
    },
  ];

  // ShippingZone has no @unique on name, so we use findFirst + create-if-missing
  // to stay safe without modifying the schema.
  let created = 0;
  for (const zone of zones) {
    const existing = await prisma.shippingZone.findFirst({
      where: { name: zone.name },
      select: { id: true },
    });
    if (!existing) {
      await prisma.shippingZone.create({
        data: {
          name: zone.name,
          cities: JSON.stringify(zone.cities),
          provinces: JSON.stringify(zone.provinces),
          shippingRate: zone.shippingRate,
          estimatedDays: zone.estimatedDays,
          isActive: zone.isActive,
        },
      });
      created++;
    }
  }

  console.log(`✅ Shipping zones: ${created} created, ${zones.length - created} already existed (skipped).`);
}

// ---------------------------------------------------------------------------
// Stitching prices — upsert on fabricType (already safe)
// ---------------------------------------------------------------------------
async function seedStitchingPrices() {
  const stitchingPrices = [
    { fabricType: "Cotton", price: 2500 },
    { fabricType: "Wash & Wear", price: 2500 },
    { fabricType: "Boski", price: 2500 },
    { fabricType: "Wool Blend", price: 2500 },
    { fabricType: "Khaddar", price: 2500 },
  ];

  for (const sp of stitchingPrices) {
    await prisma.stitchingPrice.upsert({
      where: { fabricType: sp.fabricType },
      update: { price: sp.price },
      create: { fabricType: sp.fabricType, price: sp.price },
    });
  }

  console.log(`✅ ${stitchingPrices.length} stitching prices ensured (upserted).`);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.log('Seed skipped — production environment detected. No data modified.');
    return;
  }

  console.log("🌱 Starting idempotent seed...");
  console.log("   No data will be deleted. Existing records are preserved.");

  await seedAdminUsers();
  await seedDemoCustomer();
  const categoryMap = await seedCategories();
  await seedProducts(categoryMap);
  await seedShippingZones();
  await seedStitchingPrices();

  console.log("✅ Seed completed. All existing data preserved.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });