import { prisma } from "@/lib/db";

const contentKeys = [
  "shipping_content",
  "returns_content",
  "size_guide_content",
  "about_content",
  "story_content",
] as const;

export type ContentPageKey = (typeof contentKeys)[number];

export async function getContentPage(key: ContentPageKey): Promise<string | null> {
  try {
    const config = await prisma.storeConfig.findUnique({
      where: { key },
    });
    return config?.value ?? null;
  } catch {
    return null;
  }
}