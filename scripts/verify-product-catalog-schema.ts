import { prisma } from "../lib/db";

async function main() {
  const [
    products,
    inStockProducts,
    catalogNodes,
    assignments,
    sampleProduct,
    sampleAssignment,
    sampleNode,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { inStock: true } }),
    prisma.catalogNode.count(),
      prisma.productCatalogAssignment.count(),
      prisma.product.findFirst({
        select: {
          id: true,
          sku: true,
          catalogAssignments: {
            take: 1,
            select: {
              isPrimary: true,
              catalogNode: { select: { productKind: true } },
            },
          },
        },
      }),
      prisma.productCatalogAssignment.findFirst({
        select: { id: true, isPrimary: true },
      }),
      prisma.catalogNode.findFirst({
        select: { id: true, productKind: true },
      }),
  ]);

  console.log(
    JSON.stringify(
      {
        schemaReady: true,
        products,
        inStockProducts,
        catalogNodes,
        assignments,
        sampleProductQuerySucceeded: Boolean(sampleProduct),
        primaryAssignmentColumnReadable:
          assignments === 0 || Boolean(sampleAssignment),
        productKindColumnReadable: catalogNodes === 0 || Boolean(sampleNode),
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Product/catalog schema verification failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
