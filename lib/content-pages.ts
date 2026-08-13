import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";

const contentKeys = [
  "shipping_content",
  "returns_content",
  "size_guide_content",
  "about_content",
  "story_content",
] as const;

export type ContentPageKey = (typeof contentKeys)[number];

const getCachedContentPage = unstable_cache(async (key: ContentPageKey) => {
  try {
    const config = await prisma.storeConfig.findUnique({
      where: { key },
    });
    return config?.value ?? null;
  } catch {
    return null;
  }
}, ["content-page"], { revalidate: 3600, tags: ["content-pages"] });

export async function getContentPage(key: ContentPageKey): Promise<string | null> {
  return getCachedContentPage(key);
}
