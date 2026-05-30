import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
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
