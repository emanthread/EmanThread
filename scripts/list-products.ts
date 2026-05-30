import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  console.log(JSON.stringify(products.map(p => ({ id: p.id, name: p.name })), null, 2));
}

main().finally(() => prisma.$disconnect());
