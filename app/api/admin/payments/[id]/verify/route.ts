import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { isAdminRole } from '@/lib/permissions' // A3.3
import { prisma } from '@/lib/db' // A5.1
import { verifyManualPayment } from '@/lib/db-queries'
import { triggerNotification } from '@/lib/notifications'
import { sanitizeDbError } from '@/lib/utils/errors'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || !isAdminRole(session.user.role)) { // FIXED: A3.3
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // A5.1: Prevent duplicate verification
    const existing = await prisma.manualPaymentSubmission.findUnique({ where: { id } });
    if (existing?.status !== 'PENDING') {
      return NextResponse.json({ error: 'Already processed' }, { status: 409 });
    }

    const result = await verifyManualPayment(id, session.user.id, session.user.email || '')

    // Fire-and-forget payment success notification after verification
    const order = result.order as any
    const addr = order.shippingAddress as Record<string, string> | null
    if (addr?.email) {
      triggerNotification({
        to: addr.email,
        phone: addr.phone,
        template: 'payment_success',
        data: {
          orderNumber: order.orderNumber,
          total: String(Number(order.grandTotal)),
          transactionRef: order.id,
          customerName: `${addr.firstName || ''} ${addr.lastName || ''}`.trim(),
        },
        orderId: order.id,
        // channels omitted — orchestrator handles fallback routing
      })
    }

    return NextResponse.json({ success: true, verifiedAt: new Date().toISOString() })
  } catch (error) {
    const { message, status } = sanitizeDbError(error)
    return NextResponse.json({ error: message }, { status })
  }
}