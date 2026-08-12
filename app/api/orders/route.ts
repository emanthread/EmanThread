import { NextResponse, after } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createOrder, getZoneForCity, getStoreConfig, getDiscountByCode, incrementDiscountUsage } from "@/lib/db-queries";
import {
  calculateStitchingDeliveryDate,
  getStitchingDateAvailability,
} from "@/lib/db/stitching-schedule";
import { applyDiscount } from "@/lib/discount-engine";
import { auth } from "@/auth";
import { triggerNotification, sendDeliveryUpdateParallel } from "@/lib/notifications";
import { resolveAdminRecipients } from "@/lib/notifications/admin-alerts";
import { getOrderConfirmationEmailData } from "@/lib/notifications/order-email";
import { DEFAULT_STITCHING_FEE, FEATURE_FLAGS } from "@/lib/feature-flags";
import { sanitizeDbError } from '@/lib/utils/errors';
import { checkRateLimitAsync, RateLimits } from "@/lib/rate-limiter";
import { validateCsrf } from "@/lib/csrf";
import { isAdminRole } from "@/lib/permissions";
import { mapFromPrismaFields } from "@/lib/validators/measurements-unified";
import {
  getStitchingPriceLookupKeys,
  getStitchingPriceGender,
  getStitchingVariantLabel,
  normalizeStitchingPriceKey,
  resolveStitchingPriceKey,
} from "@/lib/stitching-price";
import {
  catalogPlacementBlocksStitching,
  hasOnlyUnstitchedCatalogPaths,
} from "@/lib/commerce";
import { ARCHIVED_PRODUCT_TAG } from "@/lib/product-archive";

export const dynamic = "force-dynamic";

const ADMIN_MEASUREMENT_PREFIX = "admin_";

type AdminMeasurementRow = Record<string, unknown> & {
  id: string;
  phone?: string;
  customer_name?: string;
  garment_type?: string;
  gender?: string;
};

type CanonicalStitchingItem = {
  productId: string;
  fabricType: string;
  priceKey: string;
  stitchingPrice: number;
  adminMeasurement?: Record<string, unknown>;
  stitchingVariantName?: string;
};

function isAdminMeasurementProfileId(profileId: string): boolean {
  return profileId.startsWith(ADMIN_MEASUREMENT_PREFIX)
    && profileId.length > ADMIN_MEASUREMENT_PREFIX.length;
}

function safeDefaultStitchingFee(): number {
  return Number.isFinite(DEFAULT_STITCHING_FEE) && DEFAULT_STITCHING_FEE >= 0
    ? DEFAULT_STITCHING_FEE
    : 2500;
}

function normalizePakistanPhone(value: string | null | undefined): string | null {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  return digits.startsWith("92") ? digits : `92${digits}`;
}

function parsePakistanCalendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const pktOffsetMs = 5 * 60 * 60 * 1000;
  const date = new Date(Date.UTC(year, month - 1, day) - pktOffsetMs);
  const pktDate = new Date(date.getTime() + pktOffsetMs);

  return pktDate.getUTCFullYear() === year
    && pktDate.getUTCMonth() === month - 1
    && pktDate.getUTCDate() === day
    ? date
    : null;
}

function toCanonicalAdminMeasurement(row: AdminMeasurementRow): Record<string, unknown> {
  const mapped = mapFromPrismaFields(row);

  return {
    ...mapped,
    id: row.id,
    customerName: typeof row.customer_name === "string" ? row.customer_name : mapped.customerName,
    garmentType: typeof row.garment_type === "string" ? row.garment_type : mapped.garmentType,
    gender: typeof row.gender === "string" ? row.gender : mapped.gender,
  };
}

const MEASUREMENT_META_FIELDS = new Set([
  "id", "userId", "gender", "garmentType", "notes", "status",
  "requestedAt", "updatedAt", "deletedAt", "deliveryDate",
  "source", "createdAt", "profileName", "isDefault",
]);

function buildMeasurementSnapshot(measurement: Record<string, unknown>) {
  const garmentType = typeof measurement.garmentType === "string"
    ? measurement.garmentType
    : "";
  if (!garmentType) return null;

  const measurements: Record<string, string> = {};
  for (const [key, value] of Object.entries(measurement)) {
    if (!MEASUREMENT_META_FIELDS.has(key) && typeof value === "string" && value !== "") {
      measurements[key] = value;
    }
  }

  return {
    profileName: garmentType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
    garmentType,
    measurements,
    stylingPrefs: null,
    notes: typeof measurement.notes === "string" ? measurement.notes : "",
  };
}

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product ID is required"),
        quantity: z.number().int().min(1, "Quantity must be at least 1"),
        price: z.number().positive("Price must be positive"),
        // Optional additive option data. The order transaction resolves the ID
        // and creates the canonical snapshot; browser-provided labels are not
        // trusted for price or inventory decisions.
        variantId: z.string().min(1).max(191).optional(),
        selectedOptions: z.array(z.object({
          label: z.string().min(1).max(80),
          value: z.string().min(1).max(200),
        })).max(8).optional(),
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
  stitchingFee: z.number().finite().nonnegative().optional(),
  stitchingItems: z.array(z.object({
    productId: z.string().min(1).max(191),
    fabricType: z.string(),
    // Accepted only for old checkout clients. The server ignores it and uses
    // the price associated with the authenticated measurement/profile instead.
    stitchingPrice: z.number().finite().nonnegative(),
    priceKey: z.string().trim().min(1).max(191).optional(),
    adminMeasurement: z.any().optional(),
    stitchingVariantName: z.string().max(120).optional(),
  })).optional(),
  measurementItems: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    measurementProfileId: z.string().optional(),
  })).optional(),
  preferredDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // customer-preferred delivery date (YYYY-MM-DD)
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

    const {
      items,
      shippingAddress,
      paymentMethod,
      notes,
      couponCode,
      whatsappConsent,
      stitchingItems,
      measurementItems,
      preferredDeliveryDate,
    } = result.data;

    // Validate each product exists, price matches, and stock is sufficient
    // Batch-fetch all products in one query instead of N queries (N+1 fix)
    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, stockQuantity: true, name: true, fabricType: true, inStock: true, tags: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // A product-page control is not enough: enforce the same rule before
    // accepting any browser-supplied stitching line. The queries are gated so
    // the live legacy flow never touches additive tables before their rollout
    // flags and migrations are enabled.
    const requestedStitchingProductIds = [
      ...new Set(stitchingItems?.map((item) => item.productId) || []),
    ];
    if (requestedStitchingProductIds.length > 0) {
      const [commerceProfiles, catalogAssignments] = await Promise.all([
        FEATURE_FLAGS.COMMERCE_PROFILE_V1
          ? prisma.productCommerceProfile.findMany({
              where: { productId: { in: requestedStitchingProductIds } },
              select: { productId: true, productKind: true, stitchingEligible: true },
            })
          : Promise.resolve([]),
        FEATURE_FLAGS.CATALOG_ADMIN_ASSIGNMENTS_V1
          ? prisma.productCatalogAssignment.findMany({
              where: { productId: { in: requestedStitchingProductIds } },
              select: { productId: true, catalogNode: { select: { path: true } } },
            })
          : Promise.resolve([]),
      ]);
      const commerceProfileByProductId = new Map(
        commerceProfiles.map((profile) => [profile.productId, profile])
      );
      const catalogPathsByProductId = new Map<string, string[]>();
      for (const assignment of catalogAssignments) {
        const paths = catalogPathsByProductId.get(assignment.productId) || [];
        paths.push(assignment.catalogNode.path);
        catalogPathsByProductId.set(assignment.productId, paths);
      }

      for (const productId of requestedStitchingProductIds) {
        const profile = commerceProfileByProductId.get(productId);
        const catalogPaths = catalogPathsByProductId.get(productId);
        const inferredUnstitched = hasOnlyUnstitchedCatalogPaths(catalogPaths);
        const profileBlocksStitching = profile
          ? profile.productKind === "UNSTITCHED_FABRIC"
            ? !profile.stitchingEligible
            : !inferredUnstitched
          : false;
        if (profileBlocksStitching || (!profile && catalogPlacementBlocksStitching(catalogPaths))) {
          return NextResponse.json(
            { error: "Stitching is available only for unstitched fabric." },
            { status: 400 }
          );
        }
      }
    }

    for (const item of items) {
      const product = productMap.get(item.productId);

      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 400 }
        );
      }

      if (product.tags.includes(ARCHIVED_PRODUCT_TAG)) {
        return NextResponse.json(
          { error: `Product is no longer available: ${product.name}` },
          { status: 400 }
        );
      }

      if (item.variantId) {
        // Never query additive tables before the reviewed migration/flag is
        // live. createOrder performs variant/product/price/stock validation
        // atomically inside its transaction when the flag is enabled.
        if (!FEATURE_FLAGS.COMMERCE_PROFILE_V1) {
          return NextResponse.json(
            { error: "Product options are not available yet" },
            { status: 400 },
          );
        }
      } else {
        if (!product.inStock) {
          return NextResponse.json(
            { error: `Product out of stock: ${product.name}` },
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

        if (product.stockQuantity < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}` },
            { status: 400 }
          );
        }
      }
    }

    // Stitching always requires an authenticated, server-resolved measurement.
    // Keep this before fee calculation so browser payload values can never
    // influence an order total or the persisted stitching snapshot.
    const session = await auth();
    const userId = session?.user?.id;
    const canUseAnyAdminMeasurement = isAdminRole(session?.user?.role ?? "");

    if (!userId && stitchingItems?.length) {
      return NextResponse.json(
        { error: "Please log in to place orders with stitching." },
        { status: 400 },
      );
    }

    const canonicalStitchingItems: CanonicalStitchingItem[] = [];
    const verifiedMeasurementsByProductId = new Map<string, Record<string, unknown>>();
    if (stitchingItems?.length) {
      const itemsByProductId = new Map<string, Array<(typeof items)[number]>>();
      for (const item of items) {
        const matchingItems = itemsByProductId.get(item.productId) ?? [];
        matchingItems.push(item);
        itemsByProductId.set(item.productId, matchingItems);
      }

      const seenStitchingProductIds = new Set<string>();
      const stitchingLines: Array<{
        stitchingItem: NonNullable<typeof stitchingItems>[number];
        orderItem: (typeof items)[number];
        measurementProfileId: string;
      }> = [];

      for (const stitchingItem of stitchingItems) {
        if (seenStitchingProductIds.has(stitchingItem.productId)) {
          return NextResponse.json(
            { error: "A product can only have one stitching selection." },
            { status: 400 },
          );
        }
        seenStitchingProductIds.add(stitchingItem.productId);

        const matchingItems = itemsByProductId.get(stitchingItem.productId);
        if (!matchingItems || matchingItems.length !== 1) {
          return NextResponse.json(
            { error: "Each stitching selection must match exactly one order item." },
            { status: 400 },
          );
        }

        const orderItem = matchingItems[0];
        const measurementProfileId = orderItem.measurementProfileId;
        if (!measurementProfileId || measurementProfileId === "none") {
          return NextResponse.json(
            { error: "Please choose a measurement profile for each stitched product." },
            { status: 400 },
          );
        }

        stitchingLines.push({ stitchingItem, orderItem, measurementProfileId });
      }

      const standardProfileIds = [...new Set(
        stitchingLines
          .map((line) => line.measurementProfileId)
          .filter((profileId) => !isAdminMeasurementProfileId(profileId)),
      )];
      const adminMeasurementIds = [...new Set(
        stitchingLines
          .map((line) => line.measurementProfileId)
          .filter(isAdminMeasurementProfileId)
          .map((profileId) => profileId.slice(ADMIN_MEASUREMENT_PREFIX.length)),
      )];

      let authenticatedCustomerPhone: string | null = null;
      if (adminMeasurementIds.length > 0 && !canUseAnyAdminMeasurement) {
        const authenticatedUser = await prisma.user.findUnique({
          where: { id: userId! },
          select: { phone: true },
        });
        authenticatedCustomerPhone = normalizePakistanPhone(authenticatedUser?.phone);
        if (!authenticatedCustomerPhone) {
          return NextResponse.json(
            { error: "Add a verified phone number to your account before using an admin-stored measurement." },
            { status: 400 },
          );
        }
      }

      const ownedProfiles = standardProfileIds.length
        ? await prisma.measurementProfile.findMany({
            where: {
              id: { in: standardProfileIds },
              userId,
              deletedAt: null,
              source: "profile",
            },
          })
        : [];
      const configuredStitchingPrices = await prisma.stitchingPrice.findMany({
        select: { fabricType: true, gender: true, price: true, updatedAt: true, id: true },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      });
      const adminMeasurements = adminMeasurementIds.length
        ? await prisma.$queryRaw<AdminMeasurementRow[]>(
            Prisma.sql`
              SELECT *
              FROM "customer_measurements"
              WHERE "id" IN (${Prisma.join(adminMeasurementIds)})
                AND "deleted_at" IS NULL
            `,
          )
        : [];

      const ownedProfilesById = new Map(ownedProfiles.map((profile) => [profile.id, profile]));
      const adminMeasurementsById = new Map(adminMeasurements.map((measurement) => [measurement.id, measurement]));
      const configuredPricesByKey = new Map<string, number>();
      for (const configuredPrice of configuredStitchingPrices) {
        const amount = Number(configuredPrice.price);
        if (!Number.isFinite(amount) || amount < 0) continue;

        const key = `${configuredPrice.gender.trim().toLowerCase()}:${normalizeStitchingPriceKey(configuredPrice.fabricType)}`;
        // The newest record wins if legacy data contains case-variant duplicates.
        if (!configuredPricesByKey.has(key)) configuredPricesByKey.set(key, amount);
      }

      for (const line of stitchingLines) {
        const product = productMap.get(line.stitchingItem.productId);
        if (!product) {
          return NextResponse.json(
            { error: "The selected stitched product is no longer available." },
            { status: 400 },
          );
        }

        let garmentType: string;
        let reportedGender: string | undefined;
        let adminMeasurement: Record<string, unknown> | undefined;
        let verifiedMeasurement: Record<string, unknown>;

        if (isAdminMeasurementProfileId(line.measurementProfileId)) {
          const adminMeasurementId = line.measurementProfileId.slice(ADMIN_MEASUREMENT_PREFIX.length);
          const storedMeasurement = adminMeasurementsById.get(adminMeasurementId);
          if (!storedMeasurement) {
            return NextResponse.json(
              { error: "The selected admin measurement is no longer available." },
              { status: 400 },
            );
          }

          adminMeasurement = toCanonicalAdminMeasurement(storedMeasurement);
          if (
            !canUseAnyAdminMeasurement
            && normalizePakistanPhone(storedMeasurement.phone) !== authenticatedCustomerPhone
          ) {
            return NextResponse.json(
              { error: "The selected admin measurement is unavailable." },
              { status: 403 },
            );
          }
          if (typeof adminMeasurement.garmentType !== "string" || !adminMeasurement.garmentType.trim()) {
            return NextResponse.json(
              { error: "The selected admin measurement has no garment type." },
              { status: 400 },
            );
          }
          garmentType = adminMeasurement.garmentType;
          reportedGender = typeof adminMeasurement.gender === "string"
            ? adminMeasurement.gender
            : undefined;
          verifiedMeasurement = adminMeasurement;
        } else {
          const profile = ownedProfilesById.get(line.measurementProfileId);
          if (!profile) {
            return NextResponse.json(
              { error: "The selected measurement profile is unavailable." },
              { status: 400 },
            );
          }
          garmentType = profile.garmentType;
          reportedGender = profile.gender;
          verifiedMeasurement = profile as unknown as Record<string, unknown>;
        }

        const priceKey = resolveStitchingPriceKey(garmentType, line.stitchingItem.priceKey);
        if (!priceKey) {
          return NextResponse.json(
            { error: "The selected stitching option does not match its measurement profile." },
            { status: 400 },
          );
        }

        const gender = getStitchingPriceGender(garmentType, reportedGender);
        const configuredPrice = getStitchingPriceLookupKeys(garmentType, priceKey)
          .map((lookupKey) => configuredPricesByKey.get(
            `${gender.toLowerCase()}:${normalizeStitchingPriceKey(lookupKey)}`,
          ))
          .find((price): price is number => price !== undefined);
        const stitchingPrice = configuredPrice ?? safeDefaultStitchingFee();
        const stitchingVariantName = getStitchingVariantLabel(garmentType, priceKey);

        canonicalStitchingItems.push({
          productId: line.stitchingItem.productId,
          fabricType: product.fabricType,
          priceKey,
          stitchingPrice,
          ...(adminMeasurement ? { adminMeasurement } : {}),
          ...(stitchingVariantName
            ? { stitchingVariantName }
            : {}),
        });
        verifiedMeasurementsByProductId.set(line.stitchingItem.productId, verifiedMeasurement);
      }
    }

    const canonicalMeasurementItems = canonicalStitchingItems.map((stitchingItem) => {
      const orderItem = items.find((item) => item.productId === stitchingItem.productId)!;
      return {
        productId: stitchingItem.productId,
        productName: productMap.get(stitchingItem.productId)?.name ?? stitchingItem.productId,
        measurementProfileId: orderItem.measurementProfileId,
      };
    });

    // Measurement attachment is limited to the stitching lines we just
    // authorized. Browser-provided names and arbitrary product IDs are never
    // allowed to create an attachment on a different order line.
    if (measurementItems?.length) {
      const canonicalStitchedProductIds = new Set(
        canonicalMeasurementItems.map((item) => item.productId),
      );
      const seenMeasurementProductIds = new Set<string>();
      for (const measurementItem of measurementItems) {
        if (
          !canonicalStitchedProductIds.has(measurementItem.productId)
          || seenMeasurementProductIds.has(measurementItem.productId)
        ) {
          return NextResponse.json(
            { error: "Measurement attachments must match one selected stitched product." },
            { status: 400 },
          );
        }
        seenMeasurementProductIds.add(measurementItem.productId);
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

    const calculatedStitchingFee = canonicalStitchingItems.reduce((sum, stitchingItem) => {
      const matchedItem = items.find((item) => item.productId === stitchingItem.productId);
      return sum + stitchingItem.stitchingPrice * (matchedItem?.quantity ?? 0);
    }, 0);
      
    // Always use server-calculated stitching fee — never trust the client.
    // The `stitchingFee` field in the request body is accepted for backward
    // compatibility but is ignored; the fee is recomputed from canonical server data.
    const finalStitchingFee = calculatedStitchingFee;

    // ── Smart stitching delivery date ─────────────────────────────────────────
    // If this order has stitching, calculate the first available delivery date
    // using the configurable threshold and lead-days, respecting calendar rules.
    let stitchingDeliveryDate: Date | undefined;
    if (finalStitchingFee > 0) {
      const threshold = storeConfig.stitchingDailyThreshold ?? 12;
      const leadDays = storeConfig.stitchingLeadDays ?? 6;
      try {
        stitchingDeliveryDate = await calculateStitchingDeliveryDate(
          new Date(),
          threshold,
          leadDays
        );
      } catch (schedErr) {
        // Non-fatal: if scheduling fails, order still goes through without a delivery date
        console.error("[orders] Stitching delivery date calculation failed:", schedErr);
      }

      // If the customer picked a preferred delivery date, use it — but only if it's
      // on or after the auto-calculated earliest available date (server-side guard).
      if (preferredDeliveryDate && stitchingDeliveryDate) {
        const preferred = parsePakistanCalendarDate(preferredDeliveryDate);
        if (!preferred) {
          return NextResponse.json(
            { error: "Preferred delivery date is invalid." },
            { status: 400 },
          );
        }
        if (preferred.getTime() < stitchingDeliveryDate.getTime()) {
          return NextResponse.json(
            { error: "Preferred delivery date is earlier than the next available stitching date." },
            { status: 409 },
          );
        }

        const availability = await getStitchingDateAvailability(preferred, threshold);
        if (!availability.available) {
          return NextResponse.json(
            { error: "Preferred delivery date is no longer available. Please choose another date." },
            { status: 409 },
          );
        }
        stitchingDeliveryDate = availability.date;
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

    // FIX C2: Hard guard — guests cannot place orders with stitching
    if (!userId && canonicalStitchingItems.length > 0) {
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
      stitchingItems: canonicalStitchingItems,
      stitchingDeliveryDate,
    }, isManualPayment);

    const processedMeasurementProductIds = new Set<string>();

    // Attach one verified measurement snapshot to each stitched order item.
    if (canonicalMeasurementItems.length > 0 && userId) {
      // Wrap the entire measurement attachment in a safe try/catch to ensure
      // that any failure here does NOT roll back the already-created order.
      try {
        const { attachMeasurementToOrder } = await import('@/lib/db-queries');

        // Keep the existing order-profile record, but derive it from the
        // first already-verified stitched item instead of a loose fallback.
        const firstMeasurement = verifiedMeasurementsByProductId.get(
          canonicalMeasurementItems[0].productId,
        );
        const unified: any = firstMeasurement ? { ...firstMeasurement } : null;

      if (unified && !unified.deletedAt) {
        for (const mItem of canonicalMeasurementItems) {
          try {
            const verifiedMeasurement = verifiedMeasurementsByProductId.get(mItem.productId);
            const itemSnapshot: any = verifiedMeasurement
              ? buildMeasurementSnapshot(verifiedMeasurement)
              : null;
            if (!itemSnapshot) {
              console.error(`No verified measurement snapshot for stitched product ${mItem.productId}`);
              continue;
            }
            itemSnapshot.stitchingVariantName = canonicalStitchingItems.find((item) => item.productId === mItem.productId)?.stitchingVariantName;
            itemSnapshot.stitchingPrice = canonicalStitchingItems.find((item) => item.productId === mItem.productId)?.stitchingPrice;

            await attachMeasurementToOrder({
              orderId: order.id,
              productId: mItem.productId,
              productName: mItem.productName,
              measurementSnapshot: itemSnapshot,
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

    // Build customer/admin emails from the canonical order snapshot so selected
    // Color/Size/Shade/Volume values and the exact purchased SKU are preserved.
    after(async () => {
      const emailData = await getOrderConfirmationEmailData(order.id);
      if (!emailData) {
        console.error("[orders] Could not build order email snapshot", order.id);
        return;
      }

      if (storeConfig.orderConfirmation !== false) {
        await sendDeliveryUpdateParallel({
          to: shippingAddress.email,
          phone: shippingAddress.phone,
          template: "order_confirmation",
          data: emailData,
          orderId: order.id,
        });
      }

      if (storeConfig.newOrderAlert !== false) {
        const adminRecipients = await resolveAdminRecipients();
        await Promise.allSettled(
          adminRecipients.map((adminEmail) =>
            sendDeliveryUpdateParallel({
              to: adminEmail,
              template: "new_order_alert",
              data: emailData,
              orderId: order.id,
            }),
          ),
        );
      }
    });

    // Check for low stock after order creation and trigger alerts
    const legacyLowStockAlerts = isManualPayment ? [] : await Promise.all(
      items.filter((item) => !item.variantId).map(async (item) => {
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

    const purchasedVariantIds = isManualPayment
      ? []
      : [...new Set(items.flatMap((item) => item.variantId ? [item.variantId] : []))];
    const lowVariantRows = purchasedVariantIds.length
      ? await prisma.productVariant.findMany({
          where: { id: { in: purchasedVariantIds } },
          select: {
            sku: true,
            label: true,
            stockQuantity: true,
            commerceProfile: {
              select: {
                product: {
                  select: { name: true, sku: true, lowStockThreshold: true },
                },
              },
            },
          },
        })
      : [];
    const variantLowStockAlerts = lowVariantRows.flatMap((variant) => {
      const product = variant.commerceProfile.product;
      return variant.stockQuantity <= product.lowStockThreshold && variant.stockQuantity >= 0
        ? [{
            productName: `${product.name} — ${variant.label}`,
            sku: variant.sku || product.sku,
            stockQuantity: variant.stockQuantity.toString(),
            threshold: product.lowStockThreshold.toString(),
          }]
        : [];
    });
    const lowStockAlerts = [...legacyLowStockAlerts, ...variantLowStockAlerts];

    // Send low stock alerts to admins only — not to the customer
    const adminEmails = await resolveAdminRecipients();
    if (storeConfig.lowStockAlert !== false && adminEmails.length > 0) {
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
