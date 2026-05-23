import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const socialKeys = [
  "instagram_url",
  "facebook_url",
  "youtube_url",
  "tiktok_url",
] as const;

export async function GET() {
  try {
    const configs = await prisma.storeConfig.findMany({
      where: { key: { in: socialKeys as unknown as string[] } },
    });

    const links: Record<string, string> = {
      instagram: "",
      facebook: "",
      youtube: "",
      tiktok: "",
    };

    for (const config of configs) {
      switch (config.key) {
        case "instagram_url": links.instagram = config.value; break;
        case "facebook_url": links.facebook = config.value; break;
        case "youtube_url": links.youtube = config.value; break;
        case "tiktok_url": links.tiktok = config.value; break;
      }
    }

    return NextResponse.json(links);
  } catch (error) {
    console.error("Get social links error:", error);
    return NextResponse.json(
      { error: "Failed to load social links" },
      { status: 500 }
    );
  }
}