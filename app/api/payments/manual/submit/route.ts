import { NextResponse, after } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { createManualPaymentSubmission } from '@/lib/db-queries'
import { sendAdminPaymentAlert } from '@/lib/notifications/admin-alerts'
import { FEATURE_FLAGS } from '@/lib/feature-flags'
import { validateCsrf } from '@/lib/csrf'
import { sanitizeDbError } from '@/lib/utils/errors'

export const dynamic = 'force-dynamic'

const schema = z.object({
  orderId: z.string().min(1),
  paymentMethod: z.enum(['NAYAPAY', 'MEEZAN_BANK']),
  transactionId: z.string().min(1).max(100),
  senderName: z.string().min(1).max(100),
  screenshotUrl: z.string().url().optional(),
})

export async function POST(request: Request) {
  try {
    await validateCsrf(request)
  } catch {
    return NextResponse.json({ error: 'Your session expired. Refresh the page and try again.' }, { status: 403 })
  }

  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const data = schema.parse(body)

    // Ownership check — users can only submit proof for their own orders
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      select: { userId: true, orderNumber: true, grandTotal: true },
    })
    if (!order || order.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const submission = await createManualPaymentSubmission(data)

    // Fire-and-forget admin email alert — never blocks the response
    if (FEATURE_FLAGS.ADMIN_EMAIL_ALERTS) {
      after(() => {
        sendAdminPaymentAlert({
          orderId: submission.orderId,
          orderNumber: order.orderNumber,
          amount: Number(order.grandTotal),
          paymentMethod: data.paymentMethod,
          transactionId: data.transactionId,
          senderName: data.senderName,
          screenshotUrl: data.screenshotUrl || null,
        }).catch((err) => {
          console.error('[payments/manual] Admin alert email failed:', err)
        })
      })
    }

    return NextResponse.json({ success: true, submissionId: submission.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Check the payment details and try again.' }, { status: 400 })
    }
    if (
      error instanceof Error
      && error.message === 'Payment proof has already been submitted for this order'
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error('[payments/manual] Payment submission failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    const { message, status } = sanitizeDbError(error)
    return NextResponse.json({ error: message }, { status })
  }
}
