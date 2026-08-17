import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
} as const;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reviews = await prisma.productReview.findMany({
      where: { userId: session.user.id, deletedAt: null },
      include: {
        product: { select: { id: true, name: true, sku: true, images: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reviews, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Get user reviews error:", error);
    return NextResponse.json(
      { error: "Failed to load reviews" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
