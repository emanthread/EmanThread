import { NextRequest, NextResponse } from "next/server"
import { adminUpdateOrderMeasurement } from "@/lib/db-queries"
import { z } from "zod"
import { sanitizeDbError } from '@/lib/utils/errors'
import { requireAdminApiAccess } from "@/lib/admin-route-guard"

export const dynamic = "force-dynamic"

const updateSchema = z.object({
  measurementSnapshot: z.record(z.unknown()),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; measurementId: string }> }
) {
  const access = await requireAdminApiAccess(req)
  if (!access.ok) return access.response
  const session = access.session

  try {
    const { id: orderId, measurementId } = await params
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      )
    }

    const updated = await adminUpdateOrderMeasurement(
      measurementId,
      orderId,
      { measurementSnapshot: parsed.data.measurementSnapshot },
      session.user.id,
      session.user.email || ""
    )

    return NextResponse.json({ measurement: updated })
  } catch (error) {
    console.error("PUT measurement error:", error)
    const { message, status } = sanitizeDbError(error)
    return NextResponse.json({ error: message }, { status })
  }
}
