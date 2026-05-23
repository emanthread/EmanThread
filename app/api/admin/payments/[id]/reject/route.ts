import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { isAdminRole } from '@/lib/permissions' // A3.3
import { rejectManualPayment } from '@/lib/db-queries'

export const dynamic = 'force-dynamic'

const rejectSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || !isAdminRole(session.user.role)) { // FIXED: A3.3
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const result = rejectSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    await rejectManualPayment(id, session.user.id, session.user.email || '', result.data.reason)

    return NextResponse.json({ success: true, rejectedAt: new Date().toISOString() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}