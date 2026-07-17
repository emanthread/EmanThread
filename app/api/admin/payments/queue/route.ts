import { isAdminRole } from "@/lib/permissions";
import { NextResponse, after } from 'next/server'
import { auth } from '@/auth'
import { getPendingPaymentQueue, autoExpirePendingPayments } from '@/lib/db-queries'
import { adminLimitParam, adminPageParam } from '@/lib/admin-pagination'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Piggyback auto-expiry check safely using after()
  after(async () => {
    try {
      await autoExpirePendingPayments()
    } catch (err) {
      console.error("[payments-queue] autoExpire failed:", err)
    }
  })

  const url = new URL(request.url)
  const page = adminPageParam(url.searchParams.get('page'))
  const limit = adminLimitParam(url.searchParams.get('limit'), 20)

  const result = await getPendingPaymentQueue(page, limit)
  return NextResponse.json(result)
}
