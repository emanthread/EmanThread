import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { attachMeasurementToOrder, getOrderById } from '@/lib/db-queries'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { validateCsrf } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

const attachSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
  })),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  try {
    await validateCsrf(request)
    const { id: orderId } = await params
    const body = await request.json()
    const parsed = attachSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    // Verify order exists
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, userId: true } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    // Get unified measurement
    if (!order.userId) {
      return NextResponse.json({ error: 'Guest orders do not have a measurement record' }, { status: 404 })
    }
    const unified = await prisma.measurementProfile.findFirst({
        where: { userId: order.userId, deletedAt: null },
      });

    if (!unified || unified.deletedAt) {
      return NextResponse.json({ error: 'No measurement found for user' }, { status: 404 });
    }

    // Build snapshot
    const metaFields = new Set([
      'id', 'userId', 'gender', 'garmentType', 'notes', 'status',
      'requestedAt', 'updatedAt', 'deletedAt', 'deliveryDate',
    ]);
    const measurementFields: Record<string, string> = {};
    for (const [key, val] of Object.entries(unified)) {
      if (!metaFields.has(key) && typeof val === 'string' && val !== '') {
        measurementFields[key] = val;
      }
    }

    const readableName = unified.garmentType
      .split('_')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const snapshot = {
      profileName: readableName,
      garmentType: unified.garmentType,
      measurements: measurementFields,
      stylingPrefs: null,
      notes: unified.notes ?? '',
    };

    const results = []
    for (const item of parsed.data.items) {
      const record = await attachMeasurementToOrder({
        orderId,
        productId: item.productId,
        productName: item.productName,
        measurementSnapshot: snapshot,
      })
      results.push(record)
    }

    return NextResponse.json({ success: true, count: results.length })
  } catch (error) {
    console.error('POST attach-measurements error:', error)
    return NextResponse.json({ error: 'Failed to attach measurements' }, { status: 500 })
  }
}
