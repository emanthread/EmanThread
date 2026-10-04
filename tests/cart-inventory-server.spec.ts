import { expect, test } from '@playwright/test';
import { prisma } from '../lib/db';
import { FEATURE_FLAGS } from '../lib/feature-flags';
import { getCartInventoryProducts } from '../lib/db/cart-inventory';

test('fresh inventory subtracts pending product and size reservations without writing stock', async () => {
  const productRead = prisma.product.findMany, reservationRead = prisma.orderItem.findMany, profileRead = prisma.productCommerceProfile.findMany;
  const flag = FEATURE_FLAGS.COMMERCE_PROFILE_V1;
  const mutableFlags = FEATURE_FLAGS as { COMMERCE_PROFILE_V1: boolean };
  let requestedIds: string[] = [];
  (prisma.product.findMany as any) = async (query: any) => {
    requestedIds = query.where.id.in;
    expect(query.where.NOT.tags.contains).toBe('__eman_thread_archived__');
    return [{ id: 'shirt', name: 'Shirt', price: 1000, originalPrice: null, description: '', longDescription: '', fabricType: 'Cotton', color: 'Blue', colorHex: '#0000ff', images: '[]', tags: '[]', badge: null, inStock: true, stockQuantity: 10, sku: 'SHIRT' }];
  };
  (prisma.productCommerceProfile.findMany as any) = async () => [{ productId: 'shirt', productKind: 'READY_TO_WEAR', stitchingEligible: false, requiresSelection: true, optionLabel: 'Size', details: '[]', options: [], variants: [{ id: 'large', optionKey: 'l', label: 'L', sku: 'SHIRT-L', priceAdjustment: 200, stockQuantity: 3, inStock: true, isActive: true, selections: [] }] }];
  (prisma.orderItem.findMany as any) = async (query: any) => {
    expect(query.where.order).toEqual({ status: 'PENDING', paymentStatus: 'PENDING_VERIFICATION' });
    return [{ productId: 'shirt', quantity: 4, configuration: null }, { productId: 'shirt', quantity: 1, configuration: { productVariantId: 'large' } }];
  };
  mutableFlags.COMMERCE_PROFILE_V1 = true;
  try {
    const [product] = await getCartInventoryProducts(['shirt']);
    expect(requestedIds).toEqual(['shirt']);
    expect(product.stockQuantity).toBe(6);
    expect(product.commerce!.variants[0].stockQuantity).toBe(2);
    // Underlying stock quantities remain ten and three; this response reports availability only.
  } finally {
    prisma.product.findMany = productRead; prisma.orderItem.findMany = reservationRead; prisma.productCommerceProfile.findMany = profileRead;
    mutableFlags.COMMERCE_PROFILE_V1 = flag;
  }
});
