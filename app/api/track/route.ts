import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, referrer, utmSource, utmMedium, utmCampaign } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    await prisma.pageView.create({
      data: {
        url,
        referrer: typeof referrer === "string" ? referrer.slice(0, 500) : null,
        utmSource: typeof utmSource === "string" ? utmSource.slice(0, 200) : null,
        utmMedium: typeof utmMedium === "string" ? utmMedium.slice(0, 200) : null,
        utmCampaign: typeof utmCampaign === "string" ? utmCampaign.slice(0, 200) : null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Silently fail — tracking errors shouldn't break the page
    console.error("Track error:", error);
    return NextResponse.json({ ok: true });
  }
}