import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const featuredCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  image: z.string(),
  productCount: z.number().optional().default(0),
});

const arraySchema = z.array(featuredCategorySchema);

export async function GET() {
  try {
    const row = await prisma.storeConfig.findUnique({
      where: { key: "featured_categories" },
    });

    if (!row) {
      return NextResponse.json({ categories: [] });
    }

    try {
      const categories = JSON.parse(row.value);
      return NextResponse.json({ categories });
    } catch {
      return NextResponse.json({ categories: [] });
    }
  } catch (error) {
    console.error("Get featured categories error:", error);
    return NextResponse.json({ error: "Failed to fetch featured categories" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { categories } = body;

    const parsedCategories = arraySchema.parse(categories || []);

    await prisma.storeConfig.upsert({
      where: { key: "featured_categories" },
      update: { value: JSON.stringify(parsedCategories) },
      create: {
        key: "featured_categories",
        value: JSON.stringify(parsedCategories),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update featured categories error:", error);
    return NextResponse.json(
      { error: "Failed to update featured categories" },
      { status: 500 }
    );
  }
}
