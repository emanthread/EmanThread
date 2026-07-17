import { NextResponse } from 'next/server'
import { verifyManualPayment } from '@/lib/db-queries'
import { triggerNotification } from '@/lib/notifications'
import { sanitizeDbError } from '@/lib/utils/errors'
import { requireAdminApiAccess } from '@/lib/admin-route-guard'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireAdminApiAccess(request)
    if (!access.ok) return access.response
    const session = access.session

    const { id } = await params

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
          ...(order.stitchingDeliveryDate
            ? { stitchingDeliveryDate: new Date(order.stitchingDeliveryDate).toISOString() }
            : {}),
        },
        orderId: order.id,
        channels: ["email"], // explicitly only send email, to avoid duplicate SMS with order_confirmation
      })
    }

    return NextResponse.json({ success: true, verifiedAt: new Date().toISOString() })
  } catch (error) {
    const { message, status } = sanitizeDbError(error)
    return NextResponse.json({ error: message }, { status })
  }
}
