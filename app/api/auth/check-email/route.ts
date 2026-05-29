import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Lightweight endpoint to check if an email belongs to a staff/admin account.
 * Used by the customer login page to show a clear error message instead of
 * the misleading "check your inbox" message when an admin tries to log in
 * on the customer login page.
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ role: null }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ role: null });
    }

    const staffRoles = ["ADMIN", "SUPER_ADMIN", "MANAGER", "SUPPORT"];
    const isStaff = staffRoles.includes(user.role);

    return NextResponse.json({
      role: user.role,
      isStaff,
    });
  } catch {
    return NextResponse.json({ role: null }, { status: 500 });
  }
}