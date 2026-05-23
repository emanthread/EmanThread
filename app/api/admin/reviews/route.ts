import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/permissions"; // C4

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) { // FIXED: C4
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const productId = searchParams.get("productId") || "";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { comment: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (productId) {
      where.productId = productId;
    }

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, sku: true, images: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.productReview.count({ where }),
    ]);

    return NextResponse.json({
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    return NextResponse.json(
      { error: "Failed to load reviews" },
      { status: 500 }
    );
  }
}