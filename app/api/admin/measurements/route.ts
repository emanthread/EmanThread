import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAdminMeasurementProfiles } from '@/lib/db-queries'
import { withLoggedAdminHandler } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export const GET = withLoggedAdminHandler(async (req: Request) => {
  const session = await auth()
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session.user.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const garmentType = searchParams.get('garmentType') || undefined
  const search = searchParams.get('search') || undefined

  const result = await getAdminMeasurementProfiles(page, limit, garmentType, search)
  return NextResponse.json(result)
})
