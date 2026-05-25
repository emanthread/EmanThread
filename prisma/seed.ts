import { PrismaClient, FabricType, Badge } from "@prisma/client";
import { categories, products } from "../lib/data";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function mapFabricType(type: string): FabricType {
  switch (type) {
    case "Cotton":
      return FabricType.COTTON;
    case "Wash & Wear":
      return FabricType.WASH_AND_WEAR;
    case "Boski":
      return FabricType.BOSKI;
    case "Wool Blend":
      return FabricType.WOOL_BLEND;
    case "Khaddar":
      return FabricType.KHADDAR;
    default:
      return FabricType.COTTON;
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

async function main() {
  // Clean existing data in dependency order
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  // Seed admin users
  const adminPasswordHash = await bcrypt.hash("admin123", 12);
  const adminUser = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@emanthread.com",
      passwordHash: adminPasswordHash,
      phone: "+92 300 1234567",
      role: "ADMIN",
      isVerified: true,
    },
  });

  const emanthreadPasswordHash = await bcrypt.hash("Eman456@", 12);
  const emanthreadUser = await prisma.user.create({
    data: {
      name: "Eman Thread Admin",
      email: "emanthread@gmail.com",
      passwordHash: emanthreadPasswordHash,
      role: "ADMIN",
      isVerified: true,
    },
  });

  // Seed demo customer user
  const demoPasswordHash = await bcrypt.hash("user123", 12);
  const demoUser = await prisma.user.create({
    data: {
      name: "Ahmed Khan",
      email: "ahmed@example.com",
      passwordHash: demoPasswordHash,
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

  console.log(`Seeded admin user: ${adminUser.email}`);
  console.log(`Seeded admin user: ${emanthreadUser.email}`);
  console.log(`Seeded demo user: ${demoUser.email}`);

  // Seed categories
  const categoryMap = new Map<string, string>();

  for (const cat of categories) {
    const created = await prisma.category.create({
      data: {
        name: cat.name,
        description: cat.description,
        image: cat.image,
      },
    });
    categoryMap.set(cat.name, created.id);
  }

  // Seed products
  for (const product of products) {
    const categoryId = categoryMap.get(product.fabricType);
    if (!categoryId) {
      console.warn(`No category found for fabric type: ${product.fabricType}`);
      continue;
    }

    // Assign realistic stock quantities (20-50 range)
    const stockQuantity = 20 + Math.floor(Math.random() * 31); // 20-50

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
  }

  // Seed default shipping zones
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

  for (const zone of zones) {
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
  }

  console.log(`Seeded ${zones.length} shipping zones.`);
  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });