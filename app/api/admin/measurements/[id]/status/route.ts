import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/db-queries'
import { withLoggedAdminHandler } from '@/lib/logger'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const isAdmin = (role?: string | null) =>
  ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(role ?? '')

const statusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected'])
})

export const PATCH = withLoggedAdminHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  const { id } = await params
  const body = await req.json()
  
  const parsed = statusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  
  const updated = await prisma.measurementProfile.update({
    where: { id },
    data: { status: parsed.data.status },
  })
  
  createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    action: 'MEASUREMENT_UPDATED',
    entity: 'MeasurementProfile',
    entityId: id,
    newValue: { status: parsed.data.status },
  })
  
  return NextResponse.json(updated)
})
