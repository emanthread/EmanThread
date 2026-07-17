import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import sanitizeHtml from "sanitize-html"; // A3.4
import { requireAdminApiAccess } from "@/lib/admin-route-guard";

export const dynamic = "force-dynamic";

const contentKeys = [
  "shipping_content",
  "returns_content",
  "size_guide_content",
  "about_content",
  "story_content",
] as const;

type ContentKey = (typeof contentKeys)[number];

const updateSchema = z.object({
  key: z.enum(contentKeys),
  content: z.string(),
});

export async function GET() {
  try {
    const configs = await prisma.storeConfig.findMany({
      where: { key: { in: contentKeys as unknown as string[] } },
    });

    const result: Record<string, string> = {};
    for (const key of contentKeys) {
      const config = configs.find((c) => c.key === key);
      result[key] = config?.value ?? "";
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get content pages error:", error);
    return NextResponse.json(
      { error: "Failed to load content pages" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const access = await requireAdminApiAccess(request);
    if (!access.ok) return access.response;

    const body = await request.json();
    const { key, content } = updateSchema.parse(body);

    // A3.4: Sanitize HTML to prevent stored XSS
    const sanitized = sanitizeHtml(content, {
      allowedTags: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "img", "table", "thead", "tbody", "tr", "td", "th", "div", "span"],
      allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt", "width", "height"], td: ["colspan"], th: ["colspan"] },
    });

    await prisma.storeConfig.upsert({
      where: { key },
      create: { key, value: sanitized },
      update: { value: sanitized },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Update content page error:", error);
    return NextResponse.json(
      { error: "Failed to update content page" },
      { status: 500 }
    );
  }
}
