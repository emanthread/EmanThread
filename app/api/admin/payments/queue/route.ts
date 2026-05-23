import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getPendingPaymentQueue, autoExpirePendingPayments } from '@/lib/db-queries'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Piggyback auto-expiry check
  autoExpirePendingPayments().catch(() => {})

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '20')

  const result = await getPendingPaymentQueue(page, limit)
  return NextResponse.json(result)
}
