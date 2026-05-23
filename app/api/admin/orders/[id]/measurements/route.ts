import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getOrderMeasurements } from '@/lib/db-queries'
import { withLoggedAdminHandler } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export const GET = withLoggedAdminHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'SUPPORT'].includes(session.user.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const measurements = await getOrderMeasurements(id)
  return NextResponse.json(measurements)
})
