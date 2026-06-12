import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { adminCompletedFilter } from "@/lib/db-queries";

export const dynamic = "force-dynamic";

const isAdmin = (role?: string | null) =>
  ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(role ?? "");

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = 20;
    const search = searchParams.get("search") as string | null;
    const status = searchParams.get("status") as string | null;

    const where: Record<string, unknown> = { ...adminCompletedFilter() };
    if (status && status !== "all") {
      where.status = status;
    }
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [records, total] = await Promise.all([
      prisma.measurementProfile.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.measurementProfile.count({ where }),
    ]);

    return NextResponse.json({ records, total, page, limit });
  } catch (error) {
    console.error("Admin list completed measurements error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}