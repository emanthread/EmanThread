import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { withLoggedAdminHandler } from "@/lib/logger";
import { auth } from "@/auth";
import { revalidatePath, revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

const FEATURED_CATEGORIES_V2_KEY = "featured_categories_v2";
const FEATURED_CATEGORIES_LEGACY_KEY = "featured_categories";
const DEFAULT_SECTION_COPY = {
  eyebrow: "Our Collections",
  title: "Shop by Category",
  description: "Explore a curated selection for every style, occasion, and discovery.",
};

async function checkAdmin() {
  const session = await auth();
  if (
    !session?.user ||
    !["ADMIN", "SUPER_ADMIN"].includes(session.user.role ?? "")
  ) {
    return false;
  }
  return true;
}

const optionalText = (fallback = "") =>
  z.preprocess(
    (value) => (value == null ? undefined : value),
    z.coerce.string().optional().default(fallback)
  );

const featuredCategorySchema = z.object({
  id: optionalText(),
  name: optionalText(),
  description: optionalText(),
  image: optionalText(),
  productCount: z.coerce.number().optional().default(0),
  href: optionalText()
    .refine(
      (value) => !value || (value.startsWith("/") && !value.startsWith("//")),
      "Destination must be a site-relative path, such as /women or /shop?category=readywear"
    ),
});

const arraySchema = z.array(featuredCategorySchema);
const sectionSchema = z.object({
  eyebrow: optionalText(DEFAULT_SECTION_COPY.eyebrow),
  title: optionalText(DEFAULT_SECTION_COPY.title),
  description: optionalText(DEFAULT_SECTION_COPY.description),
  categories: arraySchema,
});

function parseSection(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    const record =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    const normalized = record
      ? {
          ...record,
          categories: record.categories ?? record.cards,
        }
      : parsed;
    const result = sectionSchema.safeParse(normalized);
    return result.success && result.data.categories.length > 0 ? result.data : null;
  } catch {
    return null;
  }
}

function parseLegacyCategories(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    const result = arraySchema.safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

export const GET = withLoggedAdminHandler(async () => {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const v2Row = await prisma.storeConfig.findUnique({
      where: { key: FEATURED_CATEGORIES_V2_KEY },
    });
    const v2 = v2Row ? parseSection(v2Row.value) : null;
    if (v2) {
      return NextResponse.json({ ...v2, source: "v2" });
    }

    const legacyRow = await prisma.storeConfig.findUnique({
      where: { key: FEATURED_CATEGORIES_LEGACY_KEY },
    });
    const categories = legacyRow ? parseLegacyCategories(legacyRow.value) : [];

    return NextResponse.json({
      ...DEFAULT_SECTION_COPY,
      categories,
      source: categories.length > 0 ? "legacy" : "default",
    });
  } catch (error) {
    console.error("Get featured categories error:", error);
    return NextResponse.json({ error: "Failed to fetch featured categories" }, { status: 500 });
  }
});

export const PUT = withLoggedAdminHandler(async (req: Request) => {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsedSection = sectionSchema.parse({
      eyebrow: body.eyebrow,
      title: body.title,
      description: body.description,
      categories: body.categories || [],
    });

    await prisma.storeConfig.upsert({
      where: { key: FEATURED_CATEGORIES_V2_KEY },
      update: { value: JSON.stringify(parsedSection) },
      create: {
        key: FEATURED_CATEGORIES_V2_KEY,
        value: JSON.stringify(parsedSection),
      },
    });

    // The home page is ISR-cached and the helpers share these cache tags.
    revalidateTag("featured-categories", "max");
    revalidateTag("categories", "max");
    revalidatePath("/", "page");
    revalidatePath("/shop", "page");

    return NextResponse.json({ success: true, ...parsedSection, source: "v2" });
  } catch (error) {
    console.error("Update featured categories error:", error);
    return NextResponse.json(
      { error: "Failed to update featured categories" },
      { status: 500 }
    );
  }
});
