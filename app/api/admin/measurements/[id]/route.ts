import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  adminGetMeasurementProfile,
  adminUpdateMeasurementProfile,
  adminDeleteMeasurementProfile,
} from '@/lib/db-queries'
import { createAuditLog } from '@/lib/db-queries'
import { updateMeasurementProfileSchema } from '@/lib/validators/measurements'
import { withLoggedAdminHandler } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const isAdmin = (role?: string | null) =>
  ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(role ?? '')

export const GET = withLoggedAdminHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const profile = await adminGetMeasurementProfile(id)
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(profile)
})

export const PUT = withLoggedAdminHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const parsed = updateMeasurementProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }
  const updated = await adminUpdateMeasurementProfile(id, parsed.data)
  createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    action: 'MEASUREMENT_UPDATED',
    entity: 'MeasurementProfile',
    entityId: id,
    newValue: parsed.data as object,
  }).catch(() => {})
  return NextResponse.json(updated)
})

export const DELETE = withLoggedAdminHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  await adminDeleteMeasurementProfile(id)
  createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    action: 'MEASUREMENT_DELETED',
    entity: 'MeasurementProfile',
    entityId: id,
  }).catch(() => {})
  return NextResponse.json({ success: true })
})
