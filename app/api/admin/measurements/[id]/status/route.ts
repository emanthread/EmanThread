import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/db-queries'
import { withLoggedAdminHandler } from '@/lib/logger'
import { z } from 'zod'
import { requireAdminApiAccess } from '@/lib/admin-route-guard'

export const dynamic = 'force-dynamic'

const statusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected'])
})

export const PATCH = withLoggedAdminHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const access = await requireAdminApiAccess(req)
  if (!access.ok) return access.response
  const session = access.session
  
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
  
  void createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    action: 'MEASUREMENT_UPDATED',
    entity: 'MeasurementProfile',
    entityId: id,
    newValue: { status: parsed.data.status },
  })
  
  return NextResponse.json(updated)
})
