import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  getUserMeasurementProfiles,
  createMeasurementProfile,
} from '@/lib/db-queries'
import { createMeasurementProfileSchema } from '@/lib/validators/measurements'
import { createAuditLog } from '@/lib/db-queries'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const profiles = await getUserMeasurementProfiles(session.user.id)
    return NextResponse.json(profiles)
  } catch (error) {
    console.error('GET /api/measurements error:', error)
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const parsed = createMeasurementProfileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }
    const profile = await createMeasurementProfile(session.user.id, parsed.data)
    createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      action: 'MEASUREMENT_CREATED',
      entity: 'MeasurementProfile',
      entityId: profile.id,
      newValue: { profileName: profile.profileName, garmentType: profile.garmentType },
    })
    return NextResponse.json(profile, { status: 201 })
  } catch (error) {
    console.error('POST /api/measurements error:', error)
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }
}
