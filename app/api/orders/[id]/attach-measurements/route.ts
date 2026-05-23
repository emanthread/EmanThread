import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { attachMeasurementToOrder, getMeasurementProfile, getOrderById } from '@/lib/db-queries'
import { z } from 'zod'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const attachSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    measurementProfileId: z.string().optional(),
  })),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  try {
    const { id: orderId } = await params
    const body = await request.json()
    const parsed = attachSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    // Verify order exists
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, userId: true } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const results = []
    for (const item of parsed.data.items) {
      let measurementSnapshot: object = {}
      let measurementProfileId: string | undefined = undefined

      if (item.measurementProfileId && session?.user?.id) {
        const profile = await getMeasurementProfile(item.measurementProfileId, session.user.id)
        if (profile) {
          measurementProfileId = profile.id
          measurementSnapshot = {
            profileName: profile.profileName,
            garmentType: profile.garmentType,
            measurements: profile.measurements,
            stylingPrefs: profile.stylingPrefs,
            notes: profile.notes,
          }
        }
      }

      const record = await attachMeasurementToOrder({
        orderId,
        productId: item.productId,
        productName: item.productName,
        measurementProfileId,
        measurementSnapshot,
      })
      results.push(record)
    }

    return NextResponse.json({ success: true, count: results.length })
  } catch (error) {
    console.error('POST attach-measurements error:', error)
    return NextResponse.json({ error: 'Failed to attach measurements' }, { status: 500 })
  }
}
