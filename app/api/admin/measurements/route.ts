import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { withLoggedAdminHandler } from '@/lib/logger'
import { adminProfileFilter } from '@/lib/db-queries'

export const dynamic = 'force-dynamic'

export const GET = withLoggedAdminHandler(async (req: Request) => {
  const session = await auth()
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session.user.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const garmentType = searchParams.get('garmentType') || undefined
  const search = searchParams.get('search') || undefined
  const status = searchParams.get('status') || undefined

  // Use centralized filter — excludes tailor requests (source !== "tailor_request")
  const where: Record<string, unknown> = { ...adminProfileFilter() }
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