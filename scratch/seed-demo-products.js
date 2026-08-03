const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const placeholderImages = [
  '["/images/fabrics/cat_cotton_1776582727723.png"]',
  '["/images/fabrics/hero_wash_1776582631696.png"]',
  '["/images/fabrics/hero_boski_1776582616605.png"]',
];

async function main() {
  console.log("Starting demo product seeding...");

  // 1. Create a dummy category for these products so they don't pollute existing fabric counts
  let demoCategory = await prisma.category.findUnique({ where: { name: 'Demo Catalog' } });
  if (!demoCategory) {
    demoCategory = await prisma.category.create({
      data: {
        name: 'Demo Catalog',
        description: 'Hidden category for new catalog products',
      }
    });
  }

  // 2. Fetch all leaf nodes
  const leafNodes = await prisma.catalogNode.findMany({
    where: { nodeType: 'leaf' }
  });

  console.log(`Found ${leafNodes.length} leaf categories.`);

  let createdCount = 0;

  for (const node of leafNodes) {
    // Determine product kind
    let productKind = 'READY_TO_WEAR';
    if (node.path.includes('fragrance')) productKind = 'FRAGRANCE';
    else if (node.path.includes('skincare') || node.path.includes('beauty')) productKind = 'BEAUTY';

    for (let i = 1; i <= 2; i++) {
      const sku = `DEMO-${node.id.split('.').pop().toUpperCase()}-00${i}`;
      
      // Check if exists
      const existing = await prisma.product.findUnique({ where: { sku } });
      if (existing) continue;

      const productName = `Demo ${node.label} Product ${i}`;
      const imageStr = placeholderImages[Math.floor(Math.random() * placeholderImages.length)];

      const product = await prisma.product.create({
        data: {
          sku,
          name: productName,
          description: `This is a demo product for ${node.label}.`,
          price: 1500 * i,
          fabricType: node.label,
          color: i === 1 ? 'Blue' : 'Red',
          colorHex: i === 1 ? '#0000FF' : '#FF0000',
          images: imageStr,
          inStock: true,
          categoryId: demoCategory.id,
          commerceProfile: {
            create: {
              productKind,
              stitchingEligible: false,
              requiresSelection: true,
              optionLabel: productKind === 'FRAGRANCE' ? 'Volume' : 'Size',
              variants: {
                create: [
                  { optionKey: 's', label: 'Small', priceAdjustment: 0, stockQuantity: 10 },
                  { optionKey: 'm', label: 'Medium', priceAdjustment: 0, stockQuantity: 10 }
                ]
              }
            }
          },
          catalogAssignments: {
            create: {
              catalogNodeId: node.id,
              isFeatured: false
            }
          }
        }
      });
      createdCount++;
    }
  }

  console.log(`Successfully created ${createdCount} demo products.`);
}

main().catch(e => {
  console.error(e);
}).finally(() => {
  prisma.$disconnect();
});
