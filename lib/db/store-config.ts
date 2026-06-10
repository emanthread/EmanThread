import { prisma } from "@/lib/db";
import { unstable_cache, revalidateTag } from "next/cache";

export interface StoreConfigInput {
  name?: string;
  tagline?: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  address?: string;
  currency?: string;
  timezone?: string;
  instagram_url?: string;
  facebook_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
  freeShippingThreshold?: number;
  standardShippingRate?: number;
  expressShippingRate?: number;
  enableCOD?: boolean;
  orderConfirmation?: boolean;
  orderShipped?: boolean;
  orderDelivered?: boolean;
  lowStockAlert?: boolean;
  newOrderAlert?: boolean;
  returnRequest?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  googleAnalyticsId?: string;
  facebookPixelId?: string;
}

async function _getStoreConfig(): Promise<StoreConfigInput> {
  let rows: { key: string; value: string }[];
  try {
    rows = await prisma.storeConfig.findMany();
  } catch {
    console.warn("[getStoreConfig] Database unreachable, using defaults");
    return {
      name: "Eman Thread",
      tagline: "The Style Never Dies",
      email: "contact@emanthreads.com",
      phone: "+92 300 1234567",
      whatsappNumber: "+92 300 1234567",
      address: "123 Fashion Street, Lahore, Pakistan",
      currency: "PKR",
      timezone: "Asia/Karachi",
      freeShippingThreshold: 5000,
      standardShippingRate: 200,
      expressShippingRate: 500,
      enableCOD: true,
      orderConfirmation: true,
      orderShipped: true,
      orderDelivered: true,
      lowStockAlert: true,
      newOrderAlert: true,
      returnRequest: true,
      metaTitle: "Eman Thread | Premium Men's Unstitched Fabric",
      metaDescription: "Discover premium unstitched fabric for men.",
      googleAnalyticsId: "",
      facebookPixelId: "",
    };
  }
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const parseBool = (key: string, fallback: boolean) => {
    const v = map.get(key);
    return v === undefined ? fallback : v === "true";
  };
  const parseNum = (key: string, fallback: number) => {
    const v = map.get(key);
    return v === undefined ? fallback : Number(v);
  };
  const parseStr = (key: string, fallback: string) => {
    return map.get(key) ?? fallback;
  };
  return {
    name: parseStr("name", "Eman Thread"),
    tagline: parseStr("tagline", "The Style Never Dies"),
    email: parseStr("email", "contact@emanthreads.com"),
    phone: parseStr("phone", "+92 300 1234567"),
    whatsappNumber: parseStr("whatsappNumber", "+92 300 1234567"),
    address: parseStr("address", "123 Fashion Street, Lahore, Pakistan"),
    currency: parseStr("currency", "PKR"),
    timezone: parseStr("timezone", "Asia/Karachi"),
    freeShippingThreshold: parseNum("freeShippingThreshold", 5000),
    standardShippingRate: parseNum("standardShippingRate", 200),
    expressShippingRate: parseNum("expressShippingRate", 500),
    enableCOD: parseBool("enableCOD", true),
    orderConfirmation: parseBool("orderConfirmation", true),
    orderShipped: parseBool("orderShipped", true),
    orderDelivered: parseBool("orderDelivered", true),
    lowStockAlert: parseBool("lowStockAlert", true),
    newOrderAlert: parseBool("newOrderAlert", true),
    returnRequest: parseBool("returnRequest", true),
    metaTitle: parseStr("metaTitle", "Eman Thread | Premium Men's Unstitched Fabric"),
    metaDescription: parseStr("metaDescription", "Discover premium unstitched fabric for men."),
    instagram_url: parseStr("instagram_url", ""),
    facebook_url: parseStr("facebook_url", ""),
    youtube_url: parseStr("youtube_url", ""),
    tiktok_url: parseStr("tiktok_url", ""),
    googleAnalyticsId: parseStr("googleAnalyticsId", ""),
    facebookPixelId: parseStr("facebookPixelId", ""),
  };
}

export const getStoreConfig = unstable_cache(
  _getStoreConfig,
  ["store-config"],
  { revalidate: 300, tags: ["store-config"] }
);

export async function setStoreConfig(data: StoreConfigInput) {
  const entries: [string, string][] = [];
  if (data.name !== undefined) entries.push(["name", data.name]);
  if (data.tagline !== undefined) entries.push(["tagline", data.tagline]);
  if (data.email !== undefined) entries.push(["email", data.email]);
  if (data.phone !== undefined) entries.push(["phone", data.phone]);
  if (data.whatsappNumber !== undefined) entries.push(["whatsappNumber", data.whatsappNumber]);
  if (data.address !== undefined) entries.push(["address", data.address]);
  if (data.currency !== undefined) entries.push(["currency", data.currency]);
  if (data.timezone !== undefined) entries.push(["timezone", data.timezone]);
  if (data.freeShippingThreshold !== undefined) entries.push(["freeShippingThreshold", String(data.freeShippingThreshold)]);
  if (data.standardShippingRate !== undefined) entries.push(["standardShippingRate", String(data.standardShippingRate)]);
  if (data.expressShippingRate !== undefined) entries.push(["expressShippingRate", String(data.expressShippingRate)]);
  if (data.enableCOD !== undefined) entries.push(["enableCOD", String(data.enableCOD)]);
  if (data.orderConfirmation !== undefined) entries.push(["orderConfirmation", String(data.orderConfirmation)]);
  if (data.orderShipped !== undefined) entries.push(["orderShipped", String(data.orderShipped)]);
  if (data.orderDelivered !== undefined) entries.push(["orderDelivered", String(data.orderDelivered)]);
  if (data.lowStockAlert !== undefined) entries.push(["lowStockAlert", String(data.lowStockAlert)]);
  if (data.newOrderAlert !== undefined) entries.push(["newOrderAlert", String(data.newOrderAlert)]);
  if (data.returnRequest !== undefined) entries.push(["returnRequest", String(data.returnRequest)]);
  if (data.metaTitle !== undefined) entries.push(["metaTitle", data.metaTitle]);
  if (data.metaDescription !== undefined) entries.push(["metaDescription", data.metaDescription]);
  if (data.instagram_url !== undefined) entries.push(["instagram_url", data.instagram_url]);
  if (data.facebook_url !== undefined) entries.push(["facebook_url", data.facebook_url]);
  if (data.youtube_url !== undefined) entries.push(["youtube_url", data.youtube_url]);
  if (data.tiktok_url !== undefined) entries.push(["tiktok_url", data.tiktok_url]);
  if (data.googleAnalyticsId !== undefined) entries.push(["googleAnalyticsId", data.googleAnalyticsId]);
  if (data.facebookPixelId !== undefined) entries.push(["facebookPixelId", data.facebookPixelId]);
  await Promise.all(
    entries.map(([key, value]) =>
      prisma.storeConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );
  // @ts-expect-error - Next.js 16 requires 2 arguments for revalidateTag in some configs
  revalidateTag("store-config", undefined);
}
