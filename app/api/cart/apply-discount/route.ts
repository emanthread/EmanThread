import { NextResponse } from "next/server";
import { z } from "zod";
import { getDiscountByCode } from "@/lib/db-queries";
import { applyDiscount } from "@/lib/discount-engine";
import type { EngineCartItem } from "@/lib/discount-engine";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

const applyDiscountSchema = z.object({
  couponCode: z.string().min(1, "Coupon code is required"),
  cartItems: z
    .array(
      z.object({
        product: z.object({
          id: z.string(),
          name: z.string(),
          price: z.number().positive(),
          images: z.array(z.string()).optional(),
        }),
        quantity: z.number().int().min(1),
      })
    )
    .min(1, "Cart cannot be empty"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = applyDiscountSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { couponCode, cartItems } = result.data;

    // Load discount from DB
    const discount = await getDiscountByCode(couponCode);

    if (!discount) {
      return NextResponse.json(
        { error: "Invalid coupon code" },
        { status: 400 }
      );
    }

    // Apply discount engine (pure function, server-side validation)
    const { discountAmount, freeItems, appliedDiscount } = applyDiscount(
      cartItems as EngineCartItem[],
      discount
    );

    if (!appliedDiscount) {
      return NextResponse.json(
        { error: "Coupon code is not applicable to this cart" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      discountAmount,
      freeItems: freeItems.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
      })),
      discount: {
        id: appliedDiscount.id,
        code: appliedDiscount.code,
        type: appliedDiscount.type,
        value: appliedDiscount.value,
      },
    });
  } catch (error) {
    console.error("Apply discount error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
}