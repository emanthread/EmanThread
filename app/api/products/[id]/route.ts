import { NextResponse } from "next/server";
import { getProductById, getRelatedProducts } from "@/lib/db-queries";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await getProductById(id);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const related = await getRelatedProducts(id, 4);

    return NextResponse.json({ product, related });
  } catch (error) {
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
}