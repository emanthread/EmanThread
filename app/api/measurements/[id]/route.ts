import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  getMeasurementProfile,
  updateMeasurementProfile,
  deleteMeasurementProfile,
} from '@/lib/db-queries'
import { updateMeasurementProfileSchema } from '@/lib/validators/measurements'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const profile = await getMeasurementProfile(id, session.user.id)
    if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(profile)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateMeasurementProfileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }
    const existing = await getMeasurementProfile(id, session.user.id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = await updateMeasurementProfile(id, session.user.id, parsed.data)
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const existing = await getMeasurementProfile(id, session.user.id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await deleteMeasurementProfile(id, session.user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 })
  }
}
