import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { isAdminRole } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

function normalizePhone(value: string | null | undefined) {
  const digits = (value ?? '').replace(/\D/g, '')
  if (digits.length === 14 && digits.startsWith('0092')) return `0${digits.slice(4)}`
  if (digits.length === 12 && digits.startsWith('92')) return `0${digits.slice(2)}`
  if (digits.length === 10 && digits.startsWith('3')) return `0${digits}`
  return digits
}

/**
 * GET /api/customer-measurements/lookup?phone=XXXX
 *
 * Authenticated endpoint. Customers can retrieve only records matching the
 * phone saved on their own account; admins may search by phone.
 * Only safe fields are exposed (no admin notes, no internal metadata).
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const phone = searchParams.get('phone')?.trim() ?? ''
  const normalizedPhone = normalizePhone(phone)

  if (!normalizedPhone || normalizedPhone.length < 7) {
    return NextResponse.json({ records: [] })
  }

  if (!isAdminRole(session.user.role ?? '')) {
    const account = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true },
    })
    const accountPhone = normalizePhone(account?.phone)

    if (!accountPhone || accountPhone !== normalizedPhone) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Exact phone match (not partial — prevents fishing for all customers)
  const results = await prisma.$queryRawUnsafe<any[]>(
    `SELECT
       "id",
       "customer_name",
       "garment_type",
       "gender",
       "length1","length2",
       "shoulder1","shoulder2",
       "chest1","chest2",
       "waist1","waist2",
       "gherra1","gherra2",
       "neck1","neck2",
       "sleeves1","sleeves2",
       "golai1","golai2",
       "armcuff1","armcuff2",
       "armplate1","armplate2",
       "golbazoo1","golbazoo2",
       "armpatti1","armpatti2",
       "collarnok1","collarnok2",
       "bane1","bane2",
       "hip1","hip2",
       "double_cb","single_cb","gol_cb","choras_cb","bane_cb","collar_cb",
       "roundneck","straight_cb","down_cb",
       "shalwar1","shalwar2","shalwar_gherra1","shalwar_gherra2",
       "shalwar_assan1","shalwar_assan2","shalwar_pancha1","shalwar_pancha2",
       "front_pocket","side_pocket","shalwar_pocket","zip_cb",
       "trouserdata1","trouserdata2","trouserdata3","trouserdata4","trouserdata5",
       "trouserdata6","trouserdata7","trouserdata8","trouserdata9","trouserdata10",
       "trouserdata11","trouserdata12","trouserdata13","trouserdata14",
       "lad_golai1","lad_golai2","lad_mori1","lad_mori2",
       "lad_bellbazoo1","lad_bellbazoo2","lad_chaak1","lad_chaak2",
       "lad_hip1","lad_hip2",
       "lad_simple_shalwar1","lad_simple_shalwar2",
       "lad_simple_shalwar_pancha1","lad_simple_shalwar_pancha2",
       "lad_simple_shalwar_gherra1","lad_simple_shalwar_gherra2",
       "lad_lastic_simple_shalwar",
       "lad_shalwar_belt1","lad_shalwar_belt2",
       "lad_shalwar_belt_pancha1","lad_shalwar_belt_pancha2",
       "lad_shalwar_belt_gherra1","lad_shalwar_belt_gherra2",
       "lad_lastic_shalwar_belt","lad_trouserdata15","lad_trouserdata16",
       "lad_trouser_elastic1",
       "created_at"
     FROM "customer_measurements"
     WHERE "phone" = $1 AND "deleted_at" IS NULL
     ORDER BY "created_at" DESC`,
    phone
  )

  // Apply centralized mapping to handle legacy keys (e.g. trouserdata1 -> trouserLength1)
  const { mapFromPrismaFields } = require('@/lib/validators/measurements-unified')
  
  const records = results.map((r: any) => ({
    id:            r.id,
    customerName:  r.customer_name,
    garmentType:   r.garment_type,
    gender:        r.gender,
    createdAt:     r.created_at,
    ...mapFromPrismaFields(r)
  }))

  return NextResponse.json({ records })
}
