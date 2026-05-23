import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { isAdminRole } from '@/lib/permissions'
import { deleteManualPayment } from '@/lib/db-queries'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    await deleteManualPayment(id, session.user.id, session.user.email || '')

    return NextResponse.json({ success: true, deletedAt: new Date().toISOString() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
