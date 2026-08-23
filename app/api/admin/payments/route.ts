import { NextResponse } from 'next/server'
import { getAllPaymentSubmissions } from '@/lib/db-queries'
import { adminLimitParam, adminPageParam, adminSearchParam } from '@/lib/admin-pagination'
import { requireAdminApiAccess } from '@/lib/admin-route-guard'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const access = await requireAdminApiAccess(request)
  if (!access.ok) return access.response

  const url = new URL(request.url)
  const page = adminPageParam(url.searchParams.get('page'))
  const limit = adminLimitParam(url.searchParams.get('limit'), 20)
  const statusResult = z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED']).optional()
    .safeParse(url.searchParams.get('status') || undefined)
  if (!statusResult.success) {
    return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 })
  }
  const status = statusResult.data
  const flagged = url.searchParams.get('flagged') === 'true' ? true : url.searchParams.get('flagged') === 'false' ? false : undefined
  const search = adminSearchParam(url.searchParams.get('search'))

  const result = await getAllPaymentSubmissions({ page, limit, status, flagged, search })
  return NextResponse.json(result)
}
