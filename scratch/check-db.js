const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      fabricType: true,
      category: {
        select: {
          name: true,
        }
      },
      commerceProfile: {
        select: {
          productKind: true
        }
      }
    }
  });
  
  console.log(JSON.stringify(products.slice(0, 10), null, 2));
  
  const distinctFabricTypes = await prisma.product.findMany({
    distinct: ['fabricType'],
    select: { fabricType: true }
  });
  console.log("Distinct fabric types:", distinctFabricTypes.map(f => f.fabricType));
  
  const distinctCategories = await prisma.category.findMany({
    select: { name: true }
  });
  console.log("Distinct categories:", distinctCategories.map(c => c.name));
}

main().catch(e => {
  console.error(e);
}).finally(() => {
  prisma.$disconnect();
});
