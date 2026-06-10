import { prisma } from "@/lib/db";

// ── Discount Interfaces ────────────────────────────────────────────

export interface CreateDiscountInput {
  code: string;
  type: "percentage" | "fixed" | "buy_x_get_y";
  value: number;
  buyQuantity?: number;
  getQuantity?: number;
  productIds?: string[];
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  startDate: string | Date | null;
  endDate: string | Date | null;
  isActive?: boolean;
}

export interface UpdateDiscountInput {
  code?: string;
  type?: "percentage" | "fixed" | "buy_x_get_y";
  value?: number;
  buyQuantity?: number;
  getQuantity?: number;
  productIds?: string[];
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  isActive?: boolean;
}

// ── Internal mapper ────────────────────────────────────────────────

function mapDiscountFromDb(d: any) {
  return {
    id: d.id,
    code: d.code,
    type: d.type as "percentage" | "fixed" | "buy_x_get_y",
    value: d.value,
    buyQuantity: d.buyQuantity ?? undefined,
    getQuantity: d.getQuantity ?? undefined,
    productIds: d.productIds ? (() => { try { return JSON.parse(d.productIds) as string[]; } catch { return []; } })() : [],
    minPurchase: d.minPurchase ?? undefined,
    maxDiscount: d.maxDiscount ?? undefined,
    usageLimit: d.usageLimit ?? undefined,
    usageCount: d.usageCount,
    startDate: d.startDate ? d.startDate.toISOString() : "",
    endDate: d.endDate ? d.endDate.toISOString() : "",
    isActive: d.isActive,
  };
}

// ── Query functions ─────────────────────────────────────────────────

/** All discounts for admin (no date filtering) */
export async function getDiscounts() {
  const discounts = await prisma.discount.findMany({
    orderBy: { createdAt: "desc" },
  });
  return discounts.map(mapDiscountFromDb);
}

/** Only currently active discounts (for storefront) */
export async function getActiveDiscounts() {
  const now = new Date();
  const discounts = await prisma.discount.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  return discounts.map(mapDiscountFromDb);
}

export async function getDiscountByCode(code: string) {
  const discount = await prisma.discount.findUnique({
    where: { code: code.toUpperCase() },
  });
  if (!discount) return null;
  return mapDiscountFromDb(discount);
}

export async function createDiscount(data: CreateDiscountInput) {
  const discount = await prisma.discount.create({
    data: {
      code: data.code.toUpperCase(),
      type: data.type,
      value: data.value,
      buyQuantity: data.buyQuantity ?? null,
      getQuantity: data.getQuantity ?? null,
      productIds: data.productIds ? JSON.stringify(data.productIds) : "[]",
      minPurchase: data.minPurchase ?? null,
      maxDiscount: data.maxDiscount ?? null,
      usageLimit: data.usageLimit ?? null,
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: data.isActive ?? true,
    },
  });
  return mapDiscountFromDb(discount);
}

export async function updateDiscount(id: string, data: UpdateDiscountInput) {
  const updateData: any = {};
  if (data.code !== undefined) updateData.code = data.code.toUpperCase();
  if (data.type !== undefined) updateData.type = data.type;
  if (data.value !== undefined) updateData.value = data.value;
  if (data.buyQuantity !== undefined) updateData.buyQuantity = data.buyQuantity;
  if (data.getQuantity !== undefined) updateData.getQuantity = data.getQuantity;
  if (data.productIds !== undefined) updateData.productIds = JSON.stringify(data.productIds);
  if (data.minPurchase !== undefined) updateData.minPurchase = data.minPurchase;
  if (data.maxDiscount !== undefined) updateData.maxDiscount = data.maxDiscount;
  if (data.usageLimit !== undefined) updateData.usageLimit = data.usageLimit;
  if (data.startDate !== undefined) updateData.startDate = data.startDate;
  if (data.endDate !== undefined) updateData.endDate = data.endDate;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const discount = await prisma.discount.update({
    where: { id },
    data: updateData,
  });
  return mapDiscountFromDb(discount);
}

export async function deleteDiscount(id: string) {
  const discount = await prisma.discount.update({
    where: { id },
    data: { isActive: false },
  });
  return mapDiscountFromDb(discount);
}

export async function incrementDiscountUsage(id: string) {
  const discount = await prisma.discount.update({
    where: { id },
    data: { usageCount: { increment: 1 } },
  });
  return {
    id: discount.id,
    code: discount.code,
    usageCount: discount.usageCount,
  };
}
