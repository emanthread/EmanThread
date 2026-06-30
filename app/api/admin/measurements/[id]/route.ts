import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/db-queries'
import { withLoggedAdminHandler } from '@/lib/logger'
import { unifiedMeasurementSchema, mapToPrismaFields } from '@/lib/validators/measurements-unified'

export const dynamic = 'force-dynamic'

const isAdmin = (role?: string | null) =>
  ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(role ?? '')

export const GET = withLoggedAdminHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const profile = await prisma.measurementProfile.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
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
  const parsed = unifiedMeasurementSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const dataToUpdate = mapToPrismaFields(parsed.data) as Record<string, any>
  if (body.status && ['pending', 'approved', 'rejected'].includes(body.status)) {
    dataToUpdate.status = body.status
  }

  const existingProfile = await prisma.measurementProfile.findUnique({ where: { id } })
  if (existingProfile?.profileName.startsWith("[Admin] ") && !dataToUpdate.profileName?.startsWith("[Admin] ")) {
    dataToUpdate.profileName = `[Admin] ${dataToUpdate.profileName || "Profile"}`
  }

  const updated = await prisma.measurementProfile.update({
    where: { id },
    data: dataToUpdate,
  })
  createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    action: 'MEASUREMENT_UPDATED',
    entity: 'MeasurementProfile',
    entityId: id,
    newValue: parsed.data as object,
  })
  return NextResponse.json(updated)
})

export const DELETE = withLoggedAdminHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  await prisma.measurementProfile.update({ where: { id }, data: { deletedAt: new Date() } })
  createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    action: 'MEASUREMENT_DELETED',
    entity: 'MeasurementProfile',
    entityId: id,
  })
  return NextResponse.json({ success: true })
})
