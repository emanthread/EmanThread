import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

const isAdmin = (role?: string | null) =>
  ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(role ?? "")

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id: orderId } = await params

  const measurements = await prisma.orderItemMeasurement.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ measurements })
}