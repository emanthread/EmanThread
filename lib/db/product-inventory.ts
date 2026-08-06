import type { Prisma } from "@prisma/client";

/**
 * Refresh the Product inventory summary after ProductVariant stock changes.
 * Required-option products derive their sellable stock from active, available
 * variants. Optional-option products retain manual Product stock, but still
 * receive a new revision timestamp so a stale editor cannot overwrite them.
 */
export async function syncProductsAfterVariantStockChange(
  tx: Prisma.TransactionClient,
  productIds: Iterable<string>
): Promise<void> {
  const ids = Array.from(new Set(productIds));
  if (ids.length === 0) return;

  const profiles = await tx.productCommerceProfile.findMany({
    where: { productId: { in: ids } },
    select: {
      productId: true,
      requiresSelection: true,
      variants: {
        where: { isActive: true, inStock: true },
        select: { stockQuantity: true },
      },
    },
  });
  const profilesByProductId = new Map(
    profiles.map((profile) => [profile.productId, profile])
  );
  const changedAt = new Date();

  for (const productId of ids) {
    const profile = profilesByProductId.get(productId);
    if (profile?.requiresSelection) {
      const stockQuantity = profile.variants.reduce(
        (total, variant) => total + variant.stockQuantity,
        0
      );
      await tx.product.updateMany({
        where: { id: productId },
        data: {
          stockQuantity,
          inStock: stockQuantity > 0,
          updatedAt: changedAt,
        },
      });
      continue;
    }

    await tx.product.updateMany({
      where: { id: productId },
      data: { updatedAt: changedAt },
    });
  }
}
