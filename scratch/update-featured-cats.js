const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const row = await prisma.storeConfig.findUnique({
    where: { key: 'featured_categories_v2' }
  });
  
  let data = null;
  if (row) {
    data = JSON.parse(row.value);
  } else {
    data = {
      eyebrow: "Our Collections",
      title: "Shop by Category",
      description: "Explore a curated selection for every style, occasion, and discovery.",
      categories: [
        { id: "cotton", name: "Cotton", description: "Breathable comfort for every season", image: "/images/fabrics/cat_cotton_1776582727723.png" },
        { id: "wash-wear", name: "Wash & Wear", description: "Effortless elegance, easy care", image: "/images/fabrics/hero_wash_1776582631696.png" },
        { id: "boski", name: "Boski", description: "Luxurious silk-cotton blend", image: "/images/fabrics/hero_boski_1776582616605.png" }
      ]
    };
  }

  // Add the new ones
  const newCats = [
    { id: "catalog:department:women", name: "WOMEN", description: "Women's Collection", image: "/images/fabrics/cat_cotton_1776582727723.png", href: "/women" },
    { id: "catalog:department:men", name: "MEN", description: "Men's Collection", image: "/images/fabrics/hero_wash_1776582631696.png", href: "/men" },
    { id: "catalog:department:fragrance-beauty", name: "FRAGRANCE & BEAUTY", description: "Fragrance & Beauty", image: "/images/fabrics/promo_1776582682565.png", href: "/fragrance-beauty" },
    { id: "catalog:department:teens", name: "TEENS", description: "Teens Collection", image: "/images/fabrics/cat_wool_1776583171222.png", href: "/teens" }
  ];

  // Append new ones if not already there
  for (const nc of newCats) {
    if (!data.categories.find(c => c.name === nc.name)) {
      data.categories.push(nc);
    }
  }

  await prisma.storeConfig.upsert({
    where: { key: 'featured_categories_v2' },
    update: { value: JSON.stringify(data) },
    create: { key: 'featured_categories_v2', value: JSON.stringify(data) }
  });

  console.log("Updated featured categories on home page.");
}

main().finally(() => prisma.$disconnect());
