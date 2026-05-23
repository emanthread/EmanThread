export type DiscountType = "percentage" | "fixed" | "buy_x_get_y";

export interface EngineCartItem {
  product: {
    id: string;
    name: string;
    price: number;
    images?: string[];
  };
  quantity: number;
}

export interface DiscountEngineInput {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  productIds?: string[];
  minPurchase?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usageCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface DiscountResult {
  discountAmount: number;
  freeItems: EngineCartItem[];
  appliedDiscount: DiscountEngineInput | null;
}

/**
 * Pure function: applies a discount to a cart and returns the calculated discount.
 * Never mutates inputs. Never trusts client-sent amounts.
 */
export function applyDiscount(
  cart: EngineCartItem[],
  discount: DiscountEngineInput
): DiscountResult {
  const now = new Date();
  const start = new Date(discount.startDate);
  const end = new Date(discount.endDate);

  // Validation gate
  if (!discount.isActive) {
    return { discountAmount: 0, freeItems: [], appliedDiscount: null };
  }
  if (now < start || now > end) {
    return { discountAmount: 0, freeItems: [], appliedDiscount: null };
  }
  if (discount.usageLimit !== null && discount.usageLimit !== undefined && discount.usageCount >= discount.usageLimit) {
    return { discountAmount: 0, freeItems: [], appliedDiscount: null };
  }

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  if (discount.minPurchase !== null && discount.minPurchase !== undefined && subtotal < discount.minPurchase) {
    return { discountAmount: 0, freeItems: [], appliedDiscount: null };
  }

  let discountAmount = 0;
  let freeItems: EngineCartItem[] = [];

  switch (discount.type) {
    case "percentage": {
      discountAmount = subtotal * (discount.value / 100);
      if (discount.maxDiscount !== null && discount.maxDiscount !== undefined) {
        discountAmount = Math.min(discountAmount, discount.maxDiscount);
      }
      break;
    }
    case "fixed": {
      discountAmount = Math.min(discount.value, subtotal);
      break;
    }
    case "buy_x_get_y": {
      const buyQty = discount.buyQuantity ?? 0;
      const getQty = discount.getQuantity ?? 0;
      if (buyQty <= 0 || getQty <= 0) {
        return { discountAmount: 0, freeItems: [], appliedDiscount: null };
      }

      // Filter to qualifying products if productIds are specified
      const restrictedIds = discount.productIds ?? [];
      const qualifyingCart = restrictedIds.length > 0
        ? cart.filter((item) => restrictedIds.includes(item.product.id))
        : cart;

      // Calculate total qualifying quantity
      const totalQualifyingQty = qualifyingCart.reduce((sum, item) => sum + item.quantity, 0);

      // Determine how many free sets we can give
      const freeSets = Math.floor(totalQualifyingQty / buyQty);
      if (freeSets <= 0) {
        return { discountAmount: 0, freeItems: [], appliedDiscount: null };
      }

      let remainingFreeItems = freeSets * getQty;

      // Build freeItems list by taking cheapest qualifying items first
      const sortedByPrice = [...qualifyingCart].sort((a, b) => a.product.price - b.product.price);

      for (const item of sortedByPrice) {
        if (remainingFreeItems <= 0) break;
        const freeQty = Math.min(item.quantity, remainingFreeItems);
        freeItems.push({
          product: item.product,
          quantity: freeQty,
        });
        discountAmount += freeQty * item.product.price;
        remainingFreeItems -= freeQty;
      }

      break;
    }
  }

  // Round to 2 decimal places for currency
  discountAmount = Math.round(discountAmount * 100) / 100;

  return {
    discountAmount,
    freeItems,
    appliedDiscount: discount,
  };
}