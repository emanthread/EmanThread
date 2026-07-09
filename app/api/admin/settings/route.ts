import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getStoreConfig, setStoreConfig, createAuditLog } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

const storeConfigSchema = z.object({
  name: z.string().optional(),
  tagline: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  address: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  instagram_url: z.string().optional(),
  facebook_url: z.string().optional(),
  youtube_url: z.string().optional(),
  tiktok_url: z.string().optional(),
  freeShippingThreshold: z.number().int().optional(),
  standardShippingRate: z.number().int().optional(),
  expressShippingRate: z.number().int().optional(),
  enableCOD: z.boolean().optional(),
  orderConfirmation: z.boolean().optional(),
  orderShipped: z.boolean().optional(),
  orderDelivered: z.boolean().optional(),
  lowStockAlert: z.boolean().optional(),
  newOrderAlert: z.boolean().optional(),
  returnRequest: z.boolean().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  googleAnalyticsId: z.string().optional(),
  facebookPixelId: z.string().optional(),
  stitchingNotice: z.string().optional(),
  stitchingDailyThreshold: z.number().int().min(1).max(200).optional(),
  stitchingLeadDays: z.number().int().min(1).max(60).optional(),
});

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role ?? "")) {
    return false;
  }
  return true;
}

export const GET = withLoggedAdminHandler(async () => {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const config = await getStoreConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Get store config error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});

export const PUT = withLoggedAdminHandler(async (req: Request) => {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = storeConfigSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    await setStoreConfig(result.data);
    const updated = await getStoreConfig();

    // Audit log
    const auditSession = await auth();
    if (auditSession?.user) {
      void createAuditLog({
        userId: auditSession.user.id,
        userEmail: auditSession.user.email || undefined,
        action: "SETTINGS_CHANGED",
        entity: "StoreConfig",
        newValue: result.data,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update store config error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
