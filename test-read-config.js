const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const row = await prisma.storeConfig.findUnique({
    where: { key: "featured_categories" }
  });
  console.log(row ? row.value : "NOT FOUND");
}

main().catch(console.error).finally(() => prisma.$disconnect());
