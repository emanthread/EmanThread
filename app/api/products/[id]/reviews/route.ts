import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  comment: z.string().min(1).max(5000),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [reviews, aggregation] = await Promise.all([
      prisma.productReview.findMany({
        where: { productId: id, isVisible: true },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.productReview.aggregate({
        where: { productId: id, isVisible: true },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return NextResponse.json({
      reviews,
      average: Number(aggregation._avg.rating?.toFixed(1) || 0),
      count: aggregation._count.rating,
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    return NextResponse.json(
      { error: "Failed to load reviews" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = createReviewSchema.parse(body);

    // Check if user already reviewed this product
    const existing = await prisma.productReview.findUnique({
      where: { productId_userId: { productId: id, userId: session.user.id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You've already reviewed this product" },
        { status: 409 }
      );
    }

    // Check if user has ordered this product (for verified badge)
    const hasOrdered = await prisma.orderItem.findFirst({
      where: {
        productId: id,
        order: { userId: session.user.id, status: "DELIVERED" },
      },
    });

    const review = await prisma.productReview.create({
      data: {
        productId: id,
        userId: session.user.id,
        rating: data.rating,
        title: data.title || null,
        comment: data.comment,
        isVisible: true,
        isVerified: !!hasOrdered,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Create review error:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}