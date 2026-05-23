import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const isAdmin = (role?: string | null) =>
  ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(role ?? "");

// GET → paginated list of all tailor measurements with user info
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const status = searchParams.get("status") as string | null;
  const gender = searchParams.get("gender") as string | null;
  const search = searchParams.get("search") as string | null;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (gender) where.gender = gender;
  if (search) {
    where.user = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [measurements, total] = await Promise.all([
    prisma.measurement.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true, phone: true } },
      },
      orderBy: { requestedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.measurement.count({ where }),
  ]);

  return NextResponse.json({ measurements, total, page, limit });
}
