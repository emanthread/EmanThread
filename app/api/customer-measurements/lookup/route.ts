import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/customer-measurements/lookup?phone=XXXX
 *
 * Public endpoint — no auth required.
 * Returns all admin-stored measurement records for the given phone number.
 * Only safe fields are exposed (no admin notes, no internal metadata).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const phone = searchParams.get('phone')?.trim()

  if (!phone || phone.length < 7) {
    return NextResponse.json({ records: [] })
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
