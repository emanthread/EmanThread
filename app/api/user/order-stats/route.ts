import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orders = await prisma.order.findMany({
      where: { userId: session.user.id },
      select: { status: true },
    });

    const total = orders.length;
    const pending = orders.filter(
      (o) => o.status === "PENDING" || o.status === "PROCESSING"
    ).length;
    const delivered = orders.filter((o) => o.status === "DELIVERED").length;

    return NextResponse.json({ total, pending, delivered });
  } catch (error) {
    console.error("Order stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order stats" },
      { status: 500 }
    );
  }
}