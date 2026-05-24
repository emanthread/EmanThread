import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/db-queries";

export const dynamic = "force-dynamic";

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(200).optional(),
  comment: z.string().trim().min(1, "Comment is required").max(5000),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [reviews, aggregation] = await Promise.all([
      prisma.productReview.findMany({
        where: { productId: id, isVisible: true, deletedAt: null },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.productReview.aggregate({
        where: { productId: id, isVisible: true, deletedAt: null },
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    
    const data = createReviewSchema.parse(body);

    // Concurrently fetch product existence, existing review, and order status
    const [product, existing, hasOrdered] = await Promise.all([
      prisma.product.findUnique({
        where: { id },
        select: { id: true },
      }),
      prisma.productReview.findUnique({
        where: { productId_userId: { productId: id, userId: session.user.id } },
      }),
      prisma.orderItem.findFirst({
        where: {
          productId: id,
          order: { userId: session.user.id, status: "DELIVERED" },
        },
      }),
    ]);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    let review;
    if (existing) {
      if (existing.deletedAt === null) {
        return NextResponse.json(
          { error: "You've already reviewed this product" },
          { status: 409 }
        );
      }
      
      // Restore and update the soft-deleted review
      review = await prisma.productReview.update({
        where: { id: existing.id },
        data: {
          rating: data.rating,
          title: data.title || null,
          comment: data.comment,
          isVisible: true,
          isVerified: !!hasOrdered,
          deletedAt: null,
        },
      });
    } else {
      review = await prisma.productReview.create({
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
    }

    // Fire-and-forget audit log for admin awareness
    try {
      await createAuditLog({
        userId: session.user.id,
        userEmail: session.user.email || undefined,
        action: "PRODUCT_UPDATED", // More accurate than USER_REGISTER
        entity: "ProductReview",
        entityId: review.id,
        newValue: { productId: id, rating: data.rating },
      });
    } catch {
      // audit log failure is non-critical
    }

    return NextResponse.json(review, { status: existing ? 200 : 201 });
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