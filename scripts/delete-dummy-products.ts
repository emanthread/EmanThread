import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: This script cannot run in production. Exiting.');
    process.exit(1);
  }

  console.warn('WARNING: This will permanently delete products with no orders.');
  console.warn('Targeting database:', process.env.DATABASE_URL?.split('@')[1] ?? 'unknown host');

  const products = await prisma.product.findMany({
    include: {
      orderItems: true
    }
  });

  console.log(`Found ${products.length} products.`);
  let deletedCount = 0;
  for (const product of products) {
    if (product.orderItems.length === 0) {
      console.log(`Deleting ${product.name} (${product.id})...`);
      await prisma.product.delete({
        where: { id: product.id }
      });
      deletedCount++;
    } else {
      console.log(`Skipping ${product.name} (${product.id}) because it has orders.`);
    }
  }
  
  console.log(`Deleted ${deletedCount} dummy products.`);
}

main().finally(() => prisma.$disconnect());
