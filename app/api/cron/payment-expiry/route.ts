import { NextResponse } from "next/server";
import { autoExpirePendingPayments } from "@/lib/db/payments";
import { sanitizeDbError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const expected = `Bearer ${process.env.CRON_SECRET}`;
    if (!process.env.CRON_SECRET || authHeader !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let expired = 0;
    for (let batch = 0; batch < 10; batch += 1) {
      const result = await autoExpirePendingPayments();
      expired += result.expired;
      if (result.expired < 200) break;
    }

    return NextResponse.json({ expired, checkedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Payment expiry cron error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export const POST = GET;
