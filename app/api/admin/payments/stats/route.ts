import { NextResponse } from 'next/server'
import { getPaymentVerificationStats } from '@/lib/db-queries'
import { requireAdminApiAccess } from '@/lib/admin-route-guard'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const access = await requireAdminApiAccess(request)
  if (!access.ok) return access.response

  const stats = await getPaymentVerificationStats()
  return NextResponse.json(stats)
}
