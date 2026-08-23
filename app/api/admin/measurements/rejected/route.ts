import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminRejectedFilter } from "@/lib/db-queries";
import { requireAdminApiAccess } from "@/lib/admin-route-guard";
import { adminPageParam, adminSearchParam } from "@/lib/admin-pagination";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const access = await requireAdminApiAccess(req);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(req.url);
    const page = adminPageParam(searchParams.get("page"));
    const limit = 20;
    const search = adminSearchParam(searchParams.get("search"));
    const statusResult = z.enum(["pending", "approved", "rejected"]).optional()
      .safeParse(searchParams.get("status") || undefined);
    if (!statusResult.success) {
      return NextResponse.json({ error: "Invalid measurement status" }, { status: 400 });
    }
    const status = statusResult.data;

    const where: Record<string, unknown> = { ...adminRejectedFilter() };
    if (status) {
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
    console.error("Admin list rejected measurements error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
