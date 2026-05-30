import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createOrder, getZoneForCity, getStoreConfig, getDiscountByCode, incrementDiscountUsage } from "@/lib/db-queries";
import { applyDiscount } from "@/lib/discount-engine";
import { auth } from "@/auth";
import { triggerNotification } from "@/lib/notifications";
import { resolveAdminRecipients } from "@/lib/notifications/admin-alerts";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product ID is required"),
        quantity: z.number().int().min(1, "Quantity must be at least 1"),
        price: z.number().positive("Price must be positive"),
      })
    )
    .min(1, "Cart cannot be empty"),
  shippingAddress: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone number is required"),
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    province: z.string().min(1, "Province is required"),
    postalCode: z.string().optional(),
  }),
  paymentMethod: z.enum(["COD", "JAZZCASH", "EASYPAISA", "CARD", "SAFEPAY", "NAYAPAY", "MEEZAN_BANK"]),
  notes: z.string().optional(),
  couponCode: z.string().optional(),
  whatsappConsent: z.boolean().optional(),
  stitchingFee: z.number().optional(),
  stitchingItems: z.array(z.object({
    productId: z.string(),
    fabricType: z.string(),
    stitchingPrice: z.number(),
  })).optional(),
  measurementItems: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    measurementProfileId: z.string(),
  })).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = createOrderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { items, shippingAddress, paymentMethod, notes, couponCode, whatsappConsent, stitchingFee, stitchingItems, measurementItems } = result.data;

    // Validate each product exists, price matches, and stock is sufficient
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 400 }
        );
      }

      const dbPrice = Number(product.price);
      if (Math.abs(dbPrice - item.price) > 0.01) {
        return NextResponse.json(
          { error: `Price mismatch for product ${product.name}` },
          { status: 400 }
        );
      }

      if (!product.inStock) {
        return NextResponse.json(
          { error: `Product out of stock: ${product.name}` },
          { status: 400 }
        );
      }

      if (product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}` },
          { status: 400 }
        );
      }
    }

    // Calculate totals
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Re-calculate shipping server-side using zone lookup (never trust client)
    const storeConfig = await getStoreConfig();
    const freeShippingThreshold = storeConfig.freeShippingThreshold ?? 5000;

    const zone = await getZoneForCity(shippingAddress.city, shippingAddress.province);
    const shippingCost = subtotal >= freeShippingThreshold ? 0 : zone.shippingRate;

    // Apply discount server-side if coupon code provided (never trust client-sent discount)
    let discountAmount = 0;
    let appliedDiscountCode: string | undefined;
    if (couponCode) {
      const discount = await getDiscountByCode(couponCode);
      if (discount) {
        const cartItemsForEngine = items.map((item) => ({
          product: {
            id: item.productId,
            name: "",
            price: item.price,
          },
          quantity: item.quantity,
        }));
        const result = applyDiscount(cartItemsForEngine, discount);
        if (result.appliedDiscount) {
          discountAmount = result.discountAmount;
          appliedDiscountCode = result.appliedDiscount.code; // C8: only pass code, increment is atomic in createOrder
        }
      }
    }

    const calculatedStitchingFee = stitchingItems && items 
      ? stitchingItems.reduce((sum, sItem) => {
          const matchedItem = items.find(i => i.productId === sItem.productId);
          return sum + sItem.stitchingPrice * (matchedItem?.quantity || 1);
        }, 0)
      : 0;
      
    const finalStitchingFee = stitchingFee ?? calculatedStitchingFee;

    const grandTotal = Math.max(0, subtotal + shippingCost - discountAmount + finalStitchingFee);

    // Enrich shipping address with zone info
    const enrichedShippingAddress = {
      ...shippingAddress,
      zoneId: zone.id,
      zoneName: zone.name,
      estimatedDays: zone.estimatedDays,
    };

    // Get user ID if authenticated (guest checkout supported)
    const session = await auth();
    const userId = session?.user?.id;

    // Update user's whatsappConsent if authenticated and consent was provided
    if (userId && whatsappConsent !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: { whatsappConsent },
      });
    }

    const isManualPayment = FEATURE_FLAGS.MANUAL_PAYMENT_MODE && (paymentMethod === "NAYAPAY" || paymentMethod === "MEEZAN_BANK");

    const order = await createOrder({
      items,
      shippingAddress: enrichedShippingAddress,
      paymentMethod,
      notes,
      userId,
      subtotal,
      shippingCost,
      grandTotal,
      discountAmount,
      couponCode: appliedDiscountCode, // C8: atomic increment inside createOrder transaction
      stitchingFee: finalStitchingFee,
      stitchingItems: stitchingItems ?? [],
    }, isManualPayment);

    // Attach measurement profiles to order items (server-side, all payment methods)
    if (measurementItems && measurementItems.length > 0 && userId) {
      const { attachMeasurementToOrder } = await import('@/lib/db-queries');
      for (const mItem of measurementItems) {
        try {
          const profile = await prisma.measurementProfile.findUnique({
            where: { id: mItem.measurementProfileId },
          });
          if (profile && profile.userId === userId) {
            await attachMeasurementToOrder({
              orderId: order.id,
              productId: mItem.productId,
              productName: mItem.productName,
              measurementProfileId: profile.id,
              measurementSnapshot: {
                profileName: profile.profileName,
                garmentType: profile.garmentType,
                measurements: profile.measurements,
                stylingPrefs: profile.stylingPrefs,
                notes: profile.notes,
              },
            });
          }
        } catch (err) {
          console.error(`Failed to attach measurement for product ${mItem.productId}:`, err);
        }
      }
    }

    // Fire-and-forget order confirmation — orchestrator handles fallback routing
    triggerNotification({
      to: shippingAddress.email,
      phone: shippingAddress.phone,
      template: "order_confirmation",
      data: {
        orderNumber: order.orderNumber,
        total: grandTotal.toString(),
        paymentMethod,
        customerName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
      },
      orderId: order.id,
      // channels omitted — orchestrator handles fallback routing
    });

    // Check for low stock after order creation and trigger alerts
    const lowStockAlerts = await Promise.all(
      items.map(async (item) => {
        const updatedProduct = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { stockQuantity: true, name: true, sku: true, lowStockThreshold: true },
        });
        if (
          updatedProduct &&
          updatedProduct.stockQuantity <= updatedProduct.lowStockThreshold &&
          updatedProduct.stockQuantity >= 0
        ) {
          return {
            productName: updatedProduct.name,
            sku: updatedProduct.sku,
            stockQuantity: updatedProduct.stockQuantity.toString(),
            threshold: updatedProduct.lowStockThreshold.toString(),
          };
        }
        return null;
      })
    );

    // Send low stock alerts to admins only — not to the customer
    const adminEmails = await resolveAdminRecipients();
    if (adminEmails.length > 0) {
      for (const alert of lowStockAlerts.filter(Boolean)) {
        for (const adminEmail of adminEmails) {
          triggerNotification({
            to: adminEmail,
            template: "low_stock_alert",
            data: alert!,
            orderId: order.id,
            channels: ["email"], // Admin email — not a phone number
          });
        }
      }
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Create order error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}