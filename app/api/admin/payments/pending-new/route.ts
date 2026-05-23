import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/payments/pending-new?since=ISO_TIMESTAMP
 *
 * Returns minimal metadata about new pending manual payment submissions
 * created after the given timestamp. Used by the admin push notification hook
 * to detect new submissions since last check.
 *
 * Guarded: requires ADMIN or SUPER_ADMIN role.
 */
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const sinceParam = searchParams.get('since')

    if (!sinceParam) {
      return NextResponse.json(
        { error: 'Missing required query parameter: since' },
        { status: 400 }
      )
    }

    const since = new Date(sinceParam)
    if (isNaN(since.getTime())) {
      return NextResponse.json(
        { error: 'Invalid since parameter — must be ISO timestamp' },
        { status: 400 }
      )
    }

    const submissions = await prisma.manualPaymentSubmission.findMany({
      where: {
        status: 'PENDING',
        createdAt: { gt: since },
      },
      select: {
        id: true,
        paymentMethod: true,
        transactionId: true,
        createdAt: true,
        order: {
          select: {
            orderNumber: true,
            grandTotal: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      submissions: submissions.map((s) => ({
        id: s.id,
        orderNumber: s.order.orderNumber,
        amount: Number(s.order.grandTotal),
        paymentMethod: s.paymentMethod,
        createdAt: s.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[pending-new] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending payments' },
      { status: 500 }
    )
  }
}