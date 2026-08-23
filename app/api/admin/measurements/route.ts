import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLoggedAdminHandler } from '@/lib/logger'
import { adminProfileFilter } from '@/lib/db-queries'
import { adminLimitParam, adminPageParam, adminSearchParam } from '@/lib/admin-pagination'
import { requireAdminApiAccess } from '@/lib/admin-route-guard'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export const GET = withLoggedAdminHandler(async (req: Request) => {
  const access = await requireAdminApiAccess(req)
  if (!access.ok) return access.response
  const { searchParams } = new URL(req.url)
  const page = adminPageParam(searchParams.get('page'))
  const limit = adminLimitParam(searchParams.get('limit'), 20)
  const garmentType = searchParams.get('garmentType') || undefined
  const search = adminSearchParam(searchParams.get('search'))
  const statusResult = z.enum(['pending', 'approved', 'rejected']).optional()
    .safeParse(searchParams.get('status') || undefined)
  if (!statusResult.success) {
    return NextResponse.json({ error: 'Invalid measurement status' }, { status: 400 })
  }
  const status = statusResult.data

  // Use centralized filter — excludes tailor requests (source !== "tailor_request")
  const where: Record<string, unknown> = { ...adminProfileFilter() }
  if (status) {
    where.status = status;
  }
  
  if (garmentType && garmentType !== 'all') {
    where.garmentType = { startsWith: garmentType === 'gents' ? 'male_' : 'female_' }
  }

  if (search) {
    where.OR = [
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { user: { phone: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [profiles, total] = await Promise.all([
    prisma.measurementProfile.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.measurementProfile.count({ where }),
  ])

  const orderNumbers = profiles
    .filter(p => p.source === 'order' && p.profileName.startsWith('Order #'))
    .map(p => p.profileName.replace('Order #', ''))

  const orders = await prisma.order.findMany({
    where: { orderNumber: { in: orderNumbers } },
    select: { orderNumber: true, createdAt: true }
  })

  const orderMap = new Map(orders.map(o => [o.orderNumber, o.createdAt]))

  const enhancedProfiles = profiles.map(p => {
    let orderCreatedAt = p.updatedAt
    if (p.source === 'order' && p.profileName.startsWith('Order #')) {
      const onum = p.profileName.replace('Order #', '')
      if (orderMap.has(onum)) {
        orderCreatedAt = orderMap.get(onum)!
      }
    }
    return {
      ...p,
      createdAt: orderCreatedAt
    }
  })

  return NextResponse.json({ profiles: enhancedProfiles, total, page, limit })
})
