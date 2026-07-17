import { NextResponse } from 'next/server'
import { deleteManualPayment } from '@/lib/db-queries'
import { sanitizeDbError } from '@/lib/utils/errors'
import { requireAdminApiAccess } from '@/lib/admin-route-guard'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireAdminApiAccess(request)
    if (!access.ok) return access.response
    const session = access.session

    const { id } = await params
    await deleteManualPayment(id, session.user.id, session.user.email || '')

    return NextResponse.json({ success: true, deletedAt: new Date().toISOString() })
  } catch (error) {
    const { message, status } = sanitizeDbError(error)
    return NextResponse.json({ error: message }, { status })
  }
}
