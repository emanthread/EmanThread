import { prisma } from "@/lib/db";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { getProductsByIdsFresh } from "@/lib/db/products";

/** Pending manual-payment orders reserve stock without deducting it yet. */
export async function getCartInventoryProducts(ids: string[]) {
  const [products, reservations] = await Promise.all([
    getProductsByIdsFresh(ids),
    prisma.orderItem.findMany({
      where: { productId: { in: ids }, order: { status: "PENDING", paymentStatus: "PENDING_VERIFICATION" } },
      select: { productId: true, quantity: true, ...(FEATURE_FLAGS.COMMERCE_PROFILE_V1 ? {
        configuration: { select: { productVariantId: true } },
      } : {}) },
    }),
  ]);
  const reserved = new Map<string, number>();
  for (const item of reservations) {
    const variantId = item.configuration?.productVariantId;
    const key = variantId ? `variant:${variantId}` : `product:${item.productId}`;
    reserved.set(key, (reserved.get(key) ?? 0) + item.quantity);
  }
  return products.map((product) => {
    const stockQuantity = Math.max(0, (product.stockQuantity ?? 0) - (reserved.get(`product:${product.id}`) ?? 0));
    return {
      ...product, stockQuantity, inStock: product.inStock && stockQuantity > 0,
      ...(product.commerce ? { commerce: { ...product.commerce, variants: product.commerce.variants.map((variant) => {
        const quantity = Math.max(0, variant.stockQuantity - (reserved.get(`variant:${variant.id}`) ?? 0));
        return { ...variant, stockQuantity: quantity, inStock: variant.inStock && quantity > 0 };
      }) } } : {}),
    };
  });
}
