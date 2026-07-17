import { NextResponse } from 'next/server'
import { getAllPaymentSubmissions } from '@/lib/db-queries'
import { adminLimitParam, adminPageParam } from '@/lib/admin-pagination'
import { requireAdminApiAccess } from '@/lib/admin-route-guard'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const access = await requireAdminApiAccess(request)
  if (!access.ok) return access.response

  const url = new URL(request.url)
  const page = adminPageParam(url.searchParams.get('page'))
  const limit = adminLimitParam(url.searchParams.get('limit'), 20)
  const status = url.searchParams.get('status') as 'PENDING' | 'VERIFIED' | 'REJECTED' | null || undefined
  const flagged = url.searchParams.get('flagged') === 'true' ? true : url.searchParams.get('flagged') === 'false' ? false : undefined

  const result = await getAllPaymentSubmissions({ page, limit, status, flagged })
  return NextResponse.json(result)
}
