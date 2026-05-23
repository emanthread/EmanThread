import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getPaymentVerificationStats } from '@/lib/db-queries'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const stats = await getPaymentVerificationStats()
  return NextResponse.json(stats)
}