import { NextResponse } from "next/server";
import { z } from "zod";
import { getCartInventoryProducts } from "@/lib/db/cart-inventory";
import { checkRateLimitAsync, RateLimits } from "@/lib/rate-limiter";
import { sanitizeDbError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0" };
const idsSchema = z.array(z.string().min(1).max(128)).min(1).max(100);

/** Read-only stock and price validation. No writes or inventory reservations. */
export async function GET(request: Request) {
  try {
    const result = idsSchema.safeParse(new URL(request.url).searchParams.getAll("id"));
    if (!result.success) return NextResponse.json({ error: "Invalid cart products" }, { status: 400, headers });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anonymous";
    const limit = await checkRateLimitAsync(`cart-inventory:${ip}`, RateLimits.cart());
    if (!limit.allowed) return NextResponse.json({ error: "Please wait before checking stock again." }, { status: 429, headers });
    const products = await getCartInventoryProducts([...new Set(result.data)]);
    return NextResponse.json({ products }, { headers });
  } catch (error) {
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status, headers });
  }
}
