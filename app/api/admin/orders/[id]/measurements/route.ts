import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAdminApiAccess } from "@/lib/admin-route-guard"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAdminApiAccess(req)
  if (!access.ok) return access.response

  const { id: orderId } = await params

  const measurements = await prisma.orderItemMeasurement.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ measurements })
}
