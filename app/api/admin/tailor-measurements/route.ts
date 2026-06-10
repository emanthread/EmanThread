import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { adminTailorRequestFilter } from "@/lib/db-queries";

export const dynamic = "force-dynamic";

const isAdmin = (role?: string | null) =>
  ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(role ?? "");

// GET → paginated list of ALL tailor measurement REQUESTS (source = "tailor_request")
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = 20;
    const status = searchParams.get("status") as string | null;
    const gender = searchParams.get("gender") as string | null;
    const garmentType = searchParams.get("garmentType") as string | null;
    const search = searchParams.get("search") as string | null;

    // Use centralized filter — ensures source: "tailor_request" is always applied
    const where: Record<string, unknown> = { ...adminTailorRequestFilter() };
    if (status) where.status = status;
    if (gender) where.gender = gender;
    if (garmentType) where.garmentType = garmentType;
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [measurements, total] = await Promise.all([
      prisma.measurementProfile.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true, phone: true } },
        },
        orderBy: { requestedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.measurementProfile.count({ where }),
    ]);

    return NextResponse.json({ measurements, total, page, limit });
  } catch (error) {
    console.error("Admin list tailor measurements error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}