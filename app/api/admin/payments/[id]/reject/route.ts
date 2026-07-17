import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rejectManualPayment } from '@/lib/db-queries'
import { triggerNotification } from '@/lib/notifications'
import { prisma } from '@/lib/db'
import { sanitizeDbError } from '@/lib/utils/errors'
import { requireAdminApiAccess } from '@/lib/admin-route-guard'

export const dynamic = 'force-dynamic'

const rejectSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireAdminApiAccess(request)
    if (!access.ok) return access.response
    const session = access.session

    const { id } = await params
    const body = await request.json()
    const result = rejectSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    await rejectManualPayment(id, session.user.id, session.user.email || '', result.data.reason)

    // Fire-and-forget rejection notification to the customer
    const submission = await prisma.manualPaymentSubmission.findUnique({
      where: { id },
      include: { order: true },
    })
    if (submission?.order) {
      const addr = submission.order.shippingAddress as Record<string, string> | null
      if (addr?.email) {
        triggerNotification({
          to: addr.email,
          phone: addr.phone,
          template: 'order_cancelled',
          data: {
            orderNumber: submission.order.orderNumber,
            total: String(Number(submission.order.grandTotal)),
            customerName: `${addr.firstName || ''} ${addr.lastName || ''}`.trim(),
            cancellationReason: `Payment rejected: ${result.data.reason}`,
          },
          orderId: submission.orderId,
          // channels omitted — orchestrator handles fallback routing
        })
      }
    }

    return NextResponse.json({ success: true, rejectedAt: new Date().toISOString() })
  } catch (error) {
    const { message, status } = sanitizeDbError(error)
    return NextResponse.json({ error: message }, { status })
  }
}
