/**
 * Diagnostic: Check CatalogNode rows for department root paths
 * and verify what banner data is stored.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const departmentPaths = ["/women", "/men", "/teens", "/fragrance-beauty"];
  
  for (const path of departmentPaths) {
    const node = await prisma.catalogNode.findFirst({
      where: { path },
      select: {
        id: true,
        path: true,
        label: true,
        slug: true,
        nodeType: true,
        bannerImage: true,
        bannerAlt: true,
        description: true,
        isActive: true,
        isVisible: true,
        parentId: true,
      },
    });

    if (!node) {
      console.log(`\n❌ NO CatalogNode found for path: ${path}`);
      continue;
    }

    console.log(`\n✅ CatalogNode found for path: ${path}`);
    console.log(`   id:          ${node.id}`);
    console.log(`   label:       ${node.label}`);
    console.log(`   nodeType:    ${node.nodeType}`);
    console.log(`   isActive:    ${node.isActive}`);
    console.log(`   isVisible:   ${node.isVisible}`);
    console.log(`   parentId:    ${node.parentId}`);
    console.log(`   bannerImage: ${node.bannerImage ?? "(null)"}`);
    console.log(`   bannerAlt:   ${node.bannerAlt ?? "(null)"}`);
    console.log(`   description: ${node.description?.substring(0, 80) ?? "(null)"}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
