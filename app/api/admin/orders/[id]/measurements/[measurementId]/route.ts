import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { adminUpdateOrderMeasurement } from "@/lib/db-queries"
import { z } from "zod"
import { sanitizeDbError } from '@/lib/utils/errors'

export const dynamic = "force-dynamic"

const isAdmin = (role?: string | null) =>
  ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(role ?? "")

const updateSchema = z.object({
  measurementSnapshot: z.record(z.unknown()),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; measurementId: string }> }
) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { measurementId } = await params
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