import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAllPaymentSubmissions } from '@/lib/db-queries'
import { adminLimitParam, adminPageParam } from '@/lib/admin-pagination'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const page = adminPageParam(url.searchParams.get('page'))
  const limit = adminLimitParam(url.searchParams.get('limit'), 20)
  const status = url.searchParams.get('status') as 'PENDING' | 'VERIFIED' | 'REJECTED' | null || undefined
  const flagged = url.searchParams.get('flagged') === 'true' ? true : url.searchParams.get('flagged') === 'false' ? false : undefined

  const result = await getAllPaymentSubmissions({ page, limit, status, flagged })
  return NextResponse.json(result)
}
