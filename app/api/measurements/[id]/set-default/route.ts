import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { setDefaultMeasurementProfile, getMeasurementProfile } from '@/lib/db-queries'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const existing = await getMeasurementProfile(id, session.user.id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = await setDefaultMeasurementProfile(id, session.user.id)
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to set default' }, { status: 500 })
  }
}
