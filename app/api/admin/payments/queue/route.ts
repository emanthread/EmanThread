import { NextResponse, after } from 'next/server'
import { getPendingPaymentQueue, autoExpirePendingPayments } from '@/lib/db-queries'
import { adminLimitParam, adminPageParam } from '@/lib/admin-pagination'
import { requireAdminApiAccess } from '@/lib/admin-route-guard'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const access = await requireAdminApiAccess(request)
  if (!access.ok) return access.response

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
