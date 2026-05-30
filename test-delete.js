const { z } = require("zod");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const featuredCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  image: z.string(),
  productCount: z.coerce.number().optional().default(0),
});

const arraySchema = z.array(featuredCategorySchema);

async function main() {
  const row = await prisma.storeConfig.findUnique({
    where: { key: "featured_categories" }
  });
  
  let categories = JSON.parse(row.value);
  console.log("Initial count:", categories.length);
  
  // Remove one
  categories.pop();
  console.log("After remove count:", categories.length);
  
  const parsedCategories = arraySchema.parse(categories || []);
  
  await prisma.storeConfig.upsert({
    where: { key: "featured_categories" },
    update: { value: JSON.stringify(parsedCategories) },
    create: {
      key: "featured_categories",
      value: JSON.stringify(parsedCategories),
    },
  });
  
  const rowAfter = await prisma.storeConfig.findUnique({
    where: { key: "featured_categories" }
  });
  console.log("Final count in DB:", JSON.parse(rowAfter.value).length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
