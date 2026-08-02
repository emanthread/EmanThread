const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const res = await prisma.catalogNode.updateMany({
    data: { isVisible: true }
  });
  console.log('Updated ' + res.count + ' categories to be visible');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
