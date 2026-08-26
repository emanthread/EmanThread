import { prisma } from "@/lib/db";
import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";

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
  enableFreeShipping?: boolean;
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
  stitchingNotice?: string;
  stitchingDailyThreshold?: number;
  stitchingLeadDays?: number;
  nayapayAccount?: string;
  nayapayName?: string;
  nayapayPhone?: string;
  meezanAccountNumber?: string;
  meezanIban?: string;
  meezanAccountName?: string;
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
      enableFreeShipping: false,
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
      stitchingNotice: "",
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
    enableFreeShipping: parseBool("enableFreeShipping", false),
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
    stitchingNotice: parseStr("stitchingNotice", ""),
    stitchingDailyThreshold: parseNum("stitchingDailyThreshold", 12),
    stitchingLeadDays: parseNum("stitchingLeadDays", 6),
    nayapayAccount: parseStr("nayapayAccount", process.env.NAYAPAY_ACCOUNT || "samar.abbas636@nayapay"),
    nayapayName: parseStr("nayapayName", process.env.NAYAPAY_NAME || "Samar Abbas"),
    nayapayPhone: parseStr("nayapayPhone", process.env.NAYAPAY_PHONE || "+92 302 2996677"),
    meezanAccountNumber: parseStr("meezanAccountNumber", process.env.MEEZAN_ACCOUNT_NUMBER || "03260114999042"),
    meezanIban: parseStr("meezanIban", process.env.MEEZAN_IBAN || "PK51MEZN0003260114999042"),
    meezanAccountName: parseStr("meezanAccountName", process.env.MEEZAN_ACCOUNT_NAME || "EMAN THREAD"),
  };
}

export const getStoreConfig = unstable_cache(
  _getStoreConfig,
  ["store-config"],
  { revalidate: 300, tags: ["store-config"] }
);

// ── Hero Slides ──────────────────────────────────────────────────────────────

export const HERO_DEPARTMENTS = [
  "all",
  "women",
  "men",
  "fragrance-beauty",
  "teens",
] as const;

export type HeroDepartment = (typeof HERO_DEPARTMENTS)[number];
export type HeroMediaType = "image" | "video";

/**
 * Hero slides are deliberately stored as JSON in StoreConfig so the live
 * database does not need a schema migration. The media and department fields
 * are optional to keep every existing image-only slide valid.
 */
export interface HeroSlide {
  id?: string;
  department?: HeroDepartment;
  mediaType?: HeroMediaType;
  image?: string;
  videoUrl?: string;
  poster?: string;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  link: string;
}

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    image: "/images/fabrics/hero_fabric_summer_1780065728421.png",
    title: "The Art of Fine Fabric",
    subtitle: "Summer Collection 2026",
    description:
      "Discover our curated selection of premium unstitched fabrics, crafted for the distinguished gentleman.",
    cta: "Shop Collection",
    link: "/women",
  },
  {
    image: "/images/fabrics/hero_fabric_boski_1780066040016.png",
    title: "Timeless Elegance",
    subtitle: "Cotton Collection",
    description:
      "Experience the luxurious silk-cotton blend that defines sophistication.",
    cta: "Explore Collection",
    link: "/men/unstitched/boski",
  },
  {
    image: "/images/fabrics/hero_fabric_wash_wear_1780066058724.png",
    title: "Comfort Meets Style",
    subtitle: "Wash & Wear",
    description:
      "Effortless elegance with easy care - perfect for the modern lifestyle.",
    cta: "Shop Now",
    link: "/men/unstitched",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isHeroDepartment(value: unknown): value is HeroDepartment {
  return typeof value === "string" && HERO_DEPARTMENTS.includes(value as HeroDepartment);
}

/**
 * Converts old image-only slide JSON into the current shape without writing
 * anything back to the database. Invalid persisted entries are ignored so a
 * malformed slide cannot break the home page.
 */
export function normalizeHeroSlide(value: unknown): HeroSlide | null {
  if (!isRecord(value)) return null;

  const title = readString(value.title);
  const subtitle = readString(value.subtitle);
  const description = readString(value.description);
  const cta = readString(value.cta);
  const link = readString(value.link);
  const image = readString(value.image);
  const videoUrl = readString(value.videoUrl);
  const poster = readString(value.poster);
  const mediaType: HeroMediaType = value.mediaType === "video" ? "video" : "image";

  if (!title || !subtitle || !description || !cta || !link) return null;
  if (mediaType === "video" ? !videoUrl : !image) return null;

  const id = readString(value.id);
  const department = isHeroDepartment(value.department) ? value.department : "all";

  return {
    ...(id ? { id } : {}),
    department,
    mediaType,
    ...(image ? { image } : {}),
    ...(videoUrl ? { videoUrl } : {}),
    ...(poster ? { poster } : {}),
    title,
    subtitle,
    description,
    cta,
    link,
  };
}

export function parseHeroSlides(value: unknown): HeroSlide[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeHeroSlide)
    .filter((slide): slide is HeroSlide => slide !== null);
}

export function parseHeroSlidesJson(value?: string | null): HeroSlide[] {
  if (!value) return [...DEFAULT_HERO_SLIDES];

  try {
    const slides = parseHeroSlides(JSON.parse(value));
    return slides.length > 0 ? slides : [...DEFAULT_HERO_SLIDES];
  } catch {
    return [...DEFAULT_HERO_SLIDES];
  }
}

/**
 * Validation for admin writes. Unlike the read normalizer, this rejects an
 * invalid new value instead of silently changing it, while still accepting
 * legacy slides that omit department and mediaType.
 */
export function validateHeroSlides(value: unknown): {
  slides?: HeroSlide[];
  error?: string;
} {
  if (!Array.isArray(value) || value.length === 0) {
    return { error: "At least one hero slide is required" };
  }

  const slides: HeroSlide[] = [];
  for (let index = 0; index < value.length; index++) {
    const slide = value[index];
    if (!isRecord(slide)) {
      return { error: `Slide ${index + 1} must be an object` };
    }

    if (slide.department !== undefined && !isHeroDepartment(slide.department)) {
      return { error: `Slide ${index + 1} has an invalid department` };
    }
    if (
      slide.mediaType !== undefined &&
      slide.mediaType !== "image" &&
      slide.mediaType !== "video"
    ) {
      return { error: `Slide ${index + 1} has an invalid media type` };
    }
    if (slide.id !== undefined && (typeof slide.id !== "string" || !slide.id.trim())) {
      return { error: `Slide ${index + 1} has an invalid id` };
    }

    const normalized = normalizeHeroSlide(slide);
    if (!normalized) {
      const mediaType = slide.mediaType === "video" ? "video URL" : "image";
      return {
        error: `Slide ${index + 1} needs a ${mediaType} and all text and link fields`,
      };
    }
    slides.push(normalized);
  }

  return { slides };
}

async function _getHeroSlides(): Promise<HeroSlide[]> {
  try {
    const row = await prisma.storeConfig.findUnique({
      where: { key: "hero_slides" },
    });
    return parseHeroSlidesJson(row?.value);
  } catch {
    return [...DEFAULT_HERO_SLIDES];
  }
}

// Cached: 5-min TTL — matches the admin expectation that slides update within 5 min.
export const getHeroSlides = unstable_cache(
  _getHeroSlides,
  ["hero-slides"],
  { revalidate: 300, tags: ["hero-slides"] }
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
  if (data.enableFreeShipping !== undefined) entries.push(["enableFreeShipping", String(data.enableFreeShipping)]);
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
  if (data.stitchingNotice !== undefined) entries.push(["stitchingNotice", data.stitchingNotice]);
  if (data.stitchingDailyThreshold !== undefined) entries.push(["stitchingDailyThreshold", String(data.stitchingDailyThreshold)]);
  if (data.stitchingLeadDays !== undefined) entries.push(["stitchingLeadDays", String(data.stitchingLeadDays)]);
  if (data.nayapayAccount !== undefined) entries.push(["nayapayAccount", data.nayapayAccount]);
  if (data.nayapayName !== undefined) entries.push(["nayapayName", data.nayapayName]);
  if (data.nayapayPhone !== undefined) entries.push(["nayapayPhone", data.nayapayPhone]);
  if (data.meezanAccountNumber !== undefined) entries.push(["meezanAccountNumber", data.meezanAccountNumber]);
  if (data.meezanIban !== undefined) entries.push(["meezanIban", data.meezanIban]);
  if (data.meezanAccountName !== undefined) entries.push(["meezanAccountName", data.meezanAccountName]);
  await prisma.$transaction(async (tx) => {
    for (const [key, value] of entries) {
      await tx.storeConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
  });
  // Financial settings must be visible on the very next checkout/quote.
  revalidateTag("store-config", { expire: 0 });
  revalidatePath("/", "layout");
}
