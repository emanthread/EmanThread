import { NextResponse } from "next/server";
import { z } from "zod";
import { getProductRecommendations } from "@/lib/db-queries";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(4),
  strategy: z.enum(["category", "cooccurrence", "hybrid"]).default("hybrid"),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { searchParams } = new URL(req.url);
    const result = querySchema.safeParse({
      limit: searchParams.get("limit") || undefined,
      strategy: searchParams.get("strategy") || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { limit, strategy } = result.data;

    const recommendations = await getProductRecommendations(id, limit);

    return NextResponse.json({
      ...recommendations,
      strategy,
    });
  } catch (error) {
    console.error("Recommendations error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
}