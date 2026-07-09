import { NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createOrder, getZoneForCity, getStoreConfig, getDiscountByCode, incrementDiscountUsage } from "@/lib/db-queries";
import { calculateStitchingDeliveryDate } from "@/lib/db/stitching-schedule";
import { applyDiscount } from "@/lib/discount-engine";
import { auth } from "@/auth";
import { triggerNotification, sendDeliveryUpdateParallel } from "@/lib/notifications";
import { resolveAdminRecipients } from "@/lib/notifications/admin-alerts";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { sanitizeDbError } from '@/lib/utils/errors';
import { checkRateLimitAsync, RateLimits } from "@/lib/rate-limiter";
import { validateCsrf } from "@/lib/csrf";

export const dynamic = "force-dynamic";

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product ID is required"),
        quantity: z.number().int().min(1, "Quantity must be at least 1"),
        price: z.number().positive("Price must be positive"),
        measurementProfileId: z.string().optional(),
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
    adminMeasurement: z.any().optional(),
  })).optional(),
  measurementItems: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    measurementProfileId: z.string().optional(),
  })).optional(),
});

export async function POST(req: Request) {
  try {
    // CSRF check
    await validateCsrf(req);

    // Rate limit by IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous";
    const rl = await checkRateLimitAsync(`order-create:${ip}`, RateLimits.order());
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rl.retryAfter ?? 1),
            "X-RateLimit-Remaining": String(rl.remaining),
          },
        }
      );
    }

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
    // Batch-fetch all products in one query instead of N queries (N+1 fix)
    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, stockQuantity: true, name: true, inStock: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of items) {
      const product = productMap.get(item.productId);

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
      
    // Always use server-calculated stitching fee — never trust the client.
    // The `stitchingFee` field in the request body is accepted for backward
    // compatibility but is ignored; the fee is recomputed from stitchingItems.
    const finalStitchingFee = calculatedStitchingFee;

    // ── Smart stitching delivery date ─────────────────────────────────────────
    // If this order has stitching, calculate the first available delivery date
    // using the configurable threshold and lead-days, respecting calendar rules.
    let stitchingDeliveryDate: Date | undefined;
    if (finalStitchingFee > 0) {
      try {
        const threshold = storeConfig.stitchingDailyThreshold ?? 12;
        const leadDays  = storeConfig.stitchingLeadDays ?? 6;
        stitchingDeliveryDate = await calculateStitchingDeliveryDate(
          new Date(),
          threshold,
          leadDays
        );
      } catch (schedErr) {
        // Non-fatal: if scheduling fails, order still goes through without a delivery date
        console.error("[orders] Stitching delivery date calculation failed:", schedErr);
      }
    }

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

    // FIX C2: Hard guard — guests cannot place orders with stitching
    if (!userId && stitchingItems && stitchingItems.length > 0) {
      return NextResponse.json(
        { error: "Please log in to place orders with stitching." },
        { status: 400 }
      );
    }

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
      stitchingDeliveryDate,
    }, isManualPayment);

    const processedMeasurementProductIds = new Set<string>();

    // Attach unified measurement profile to order items (server-side, all payment methods)
    if (measurementItems && measurementItems.length > 0 && userId) {
      // Wrap the entire measurement attachment in a safe try/catch to ensure
      // that any failure here does NOT roll back the already-created order.
      try {
        const { attachMeasurementToOrder } = await import('@/lib/db-queries');

        // Use the specific measurementProfileId from the first stitching item if provided
        const specifiedProfileId = measurementItems.find(mi => mi.measurementProfileId)?.measurementProfileId
          ?? items.find(i => (i as any).measurementProfileId)?.measurementProfileId;
          
        // Check if an adminMeasurement was passed from the frontend
        const adminMeasurement = stitchingItems?.find(s => s.adminMeasurement != null)?.adminMeasurement;

        let unified;
        if (adminMeasurement) {
          // Map adminMeasurement to match MeasurementProfile structure
          unified = { ...adminMeasurement, source: "admin", notes: "Admin Stored Measurement" };
        } else if (specifiedProfileId) {
          unified = await prisma.measurementProfile.findFirst({
            where: { id: specifiedProfileId, userId, deletedAt: null, source: "profile" },
          });
        }

        // Fallback: if no specific profile specified, use the user's default (or most recent) profile
        if (!unified) {
          unified = await prisma.measurementProfile.findFirst({
            where: { userId, deletedAt: null, source: "profile" },
            orderBy: { updatedAt: 'desc' },
          });
        }

      if (unified && !unified.deletedAt) {
        // Build a flattened measurements map from the Measurement columns
        const metaFields = new Set([
          'id', 'userId', 'gender', 'garmentType', 'notes', 'status',
          'requestedAt', 'updatedAt', 'deletedAt', 'deliveryDate',
          'source', 'createdAt', 'profileName', 'isDefault',
        ]);
        const measurementFields: Record<string, string> = {};
        for (const [key, val] of Object.entries(unified)) {
          if (!metaFields.has(key) && typeof val === 'string' && val !== '') {
            measurementFields[key] = val;
          }
        }

        const readableName = unified.garmentType
          .split('_')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        const snapshot = {
          profileName: readableName,
          garmentType: unified.garmentType,
          measurements: measurementFields,
          stylingPrefs: null,
          notes: unified.notes ?? '',
        };

        for (const mItem of measurementItems) {
          try {
            await attachMeasurementToOrder({
              orderId: order.id,
              productId: mItem.productId,
              productName: mItem.productName,
              measurementSnapshot: snapshot,
            });
            processedMeasurementProductIds.add(mItem.productId);
          } catch (err) {
            console.error(`Failed to attach measurement for product ${mItem.productId}:`, err);
          }
        }

        // Also create a MeasurementProfile with source: "order" so it appears
        // in admin/measurements → "Measurement Profiles" tab (which filters by source: "order")
        try {
          await prisma.measurementProfile.create({
            data: {
              userId,
              gender: unified.gender,
              garmentType: unified.garmentType,
              profileName: `Order #${order.orderNumber}`,
              notes: unified.notes ?? '',
              source: "order",
              // Copy all measurement fields from the unified profile
              length1: unified.length1, length2: unified.length2,
              shoulder1: unified.shoulder1, shoulder2: unified.shoulder2,
              chest1: unified.chest1, chest2: unified.chest2,
              waist1: unified.waist1, waist2: unified.waist2,
              gherra1: unified.gherra1, gherra2: unified.gherra2,
              neck1: unified.neck1, neck2: unified.neck2,
              sleeves1: unified.sleeves1, sleeves2: unified.sleeves2,
              golai1: unified.golai1, golai2: unified.golai2,
              armcuff1: unified.armcuff1, armcuff2: unified.armcuff2,
              armplate1: unified.armplate1, armplate2: unified.armplate2,
              golbazoo1: unified.golbazoo1, golbazoo2: unified.golbazoo2,
              armpatti1: unified.armpatti1, armpatti2: unified.armpatti2,
              collarnok1: unified.collarnok1, collarnok2: unified.collarnok2,
              bane1: unified.bane1, bane2: unified.bane2,
              ladHip1: unified.ladHip1, ladHip2: unified.ladHip2,
              hip1: unified.hip1, hip2: unified.hip2,
              shalwar1: unified.shalwar1, shalwar2: unified.shalwar2,
              shalwarPancha1: unified.shalwarPancha1, shalwarPancha2: unified.shalwarPancha2,
              shalwarGherra1: unified.shalwarGherra1, shalwarGherra2: unified.shalwarGherra2,
              shalwarAssan1: unified.shalwarAssan1, shalwarAssan2: unified.shalwarAssan2,
              trouserdata1: unified.trouserdata1, trouserdata2: unified.trouserdata2,
              trouserdata3: unified.trouserdata3, trouserdata4: unified.trouserdata4,
              trouserdata5: unified.trouserdata5,
              trouserdata6: unified.trouserdata6, trouserdata7: unified.trouserdata7,
              trouserdata8: unified.trouserdata8, trouserdata9: unified.trouserdata9,
              trouserdata10: unified.trouserdata10,
              doubleCb: unified.doubleCb, singleCb: unified.singleCb,
              golCb: unified.golCb, chorasCb: unified.chorasCb,
              baneCb: unified.baneCb, collarCb: unified.collarCb,
              roundneck: unified.roundneck,
              straightCb: unified.straightCb,
              downCb: unified.downCb,
              frontPocket: unified.frontPocket,
              sidePocket: unified.sidePocket,
              shalwarPocket: unified.shalwarPocket,
              zipCb: unified.zipCb,
              ladGolai1: unified.ladGolai1, ladGolai2: unified.ladGolai2,
              ladMori1: unified.ladMori1, ladMori2: unified.ladMori2,
              ladBellbazoo1: unified.ladBellbazoo1, ladBellbazoo2: unified.ladBellbazoo2,
              ladChaak1: unified.ladChaak1, ladChaak2: unified.ladChaak2,
              ladSimpleShalwar1: unified.ladSimpleShalwar1, ladSimpleShalwar2: unified.ladSimpleShalwar2,
              ladSimpleShalwarPancha1: unified.ladSimpleShalwarPancha1, ladSimpleShalwarPancha2: unified.ladSimpleShalwarPancha2,
              ladSimpleShalwarGherra1: unified.ladSimpleShalwarGherra1, ladSimpleShalwarGherra2: unified.ladSimpleShalwarGherra2,
              ladLasticSimpleShalwar: unified.ladLasticSimpleShalwar,
              ladShalwarBelt1: unified.ladShalwarBelt1, ladShalwarBelt2: unified.ladShalwarBelt2,
              ladShalwarBeltPancha1: unified.ladShalwarBeltPancha1, ladShalwarBeltPancha2: unified.ladShalwarBeltPancha2,
              ladShalwarBeltGherra1: unified.ladShalwarBeltGherra1, ladShalwarBeltGherra2: unified.ladShalwarBeltGherra2,
              ladLasticShalwarBelt: unified.ladLasticShalwarBelt,
              ladTrouserdata15: unified.ladTrouserdata15,
              ladTrouserdata16: unified.ladTrouserdata16,
            },
          });
        } catch (err) {
          console.error(`Failed to create order-linked measurement profile for user ${userId}:`, err);
        }
      } else {
        console.warn(`User ${userId} requested stitching but has no measurement record.`);
      }
    } catch (attachmentError) {
      // Measurement attachment failed but the order was already created successfully.
      // Log the error for debugging but do NOT rethrow — the order is valid.
      console.error("Measurement attachment failed (order still created):", {
        orderId: order.id,
        userId,
        error: attachmentError instanceof Error ? attachmentError.message : String(attachmentError),
      });
    }
  }

    // Also process item-level measurementProfileId from each validated item
    const validatedItems = items;
    for (const item of validatedItems) {
      if (item.measurementProfileId && userId && !processedMeasurementProductIds.has(item.productId)) {
        try {
          const profile = await prisma.measurementProfile.findFirst({
            where: { id: item.measurementProfileId, userId, deletedAt: null },
          });
          if (profile) {
            // Build snapshot from profile
            const metaFields = new Set([
              'id', 'userId', 'gender', 'garmentType', 'notes', 'status',
              'requestedAt', 'updatedAt', 'deletedAt', 'deliveryDate',
              'source', 'createdAt', 'profileName', 'isDefault',
            ]);
            const measurementFields: Record<string, string> = {};
            for (const [key, val] of Object.entries(profile)) {
              if (!metaFields.has(key) && typeof val === 'string' && val !== '') {
                measurementFields[key] = val;
              }
            }
            const readableName = profile.garmentType
              .split('_')
              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ');
            const snapshot = {
              profileName: readableName,
              garmentType: profile.garmentType,
              measurements: measurementFields,
              stylingPrefs: null,
              notes: profile.notes ?? '',
            };
            const productName = productMap.get(item.productId)?.name ?? item.productId;
            const { attachMeasurementToOrder } = await import('@/lib/db-queries');
            await attachMeasurementToOrder({
              orderId: order.id,
              productId: item.productId,
              productName,
              measurementSnapshot: snapshot,
            });
          }
        } catch (err) {
          console.error(`[ITEM_MEASUREMENT_ATTACH_ERROR] product ${item.productId}:`, err);
        }
      }
    }

    // Fire-and-forget order confirmation — orchestrator handles fallback routing
    after(async () => {
      await sendDeliveryUpdateParallel({
        to: shippingAddress.email,
        phone: shippingAddress.phone,
        template: "order_confirmation",
        data: {
          orderNumber: order.orderNumber,
          total: grandTotal.toString(),
          paymentMethod,
          customerName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
          ...(stitchingDeliveryDate
            ? { stitchingDeliveryDate: stitchingDeliveryDate.toISOString() }
            : {}),
        },
        orderId: order.id,
      });
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

    return NextResponse.json(
      {
        ...order,
        stitchingDeliveryDate: order.stitchingDeliveryDate ?? null,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.message === "CSRF validation failed") {
      return NextResponse.json(
        { error: "Forbidden: invalid CSRF token" },
        { status: 403 }
      );
    }
    console.error("Create order error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
}