import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const expected = `Bearer ${process.env.CRON_SECRET}`;
    if (!process.env.CRON_SECRET || authHeader !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { count } = await prisma.emailVerificationToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    return NextResponse.json({ deleted: count });
  } catch (error) {
    console.error("Cleanup tokens error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
