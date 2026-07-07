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

  // Convert snake_case keys to camelCase for frontend consistency
  const records = results.map((r: any) => ({
    id:            r.id,
    customerName:  r.customer_name,
    garmentType:   r.garment_type,
    gender:        r.gender,
    // Kameez
    length1:       r.length1, length2: r.length2,
    shoulder1:     r.shoulder1, shoulder2: r.shoulder2,
    chest1:        r.chest1, chest2: r.chest2,
    waist1:        r.waist1, waist2: r.waist2,
    gherra1:       r.gherra1, gherra2: r.gherra2,
    neck1:         r.neck1, neck2: r.neck2,
    sleeves1:      r.sleeves1, sleeves2: r.sleeves2,
    golai1:        r.golai1, golai2: r.golai2,
    armcuff1:      r.armcuff1, armcuff2: r.armcuff2,
    armplate1:     r.armplate1, armplate2: r.armplate2,
    golbazoo1:     r.golbazoo1, golbazoo2: r.golbazoo2,
    armpatti1:     r.armpatti1, armpatti2: r.armpatti2,
    collarnok1:    r.collarnok1, collarnok2: r.collarnok2,
    bane1:         r.bane1, bane2: r.bane2,
    hip1:          r.hip1, hip2: r.hip2,
    doubleCb:      r.double_cb, singleCb: r.single_cb,
    golCb:         r.gol_cb, chorasCb: r.choras_cb,
    baneCb:        r.bane_cb, collarCb: r.collar_cb,
    roundneck:     r.roundneck, straightCb: r.straight_cb, downCb: r.down_cb,
    // Shalwar
    shalwar1:      r.shalwar1, shalwar2: r.shalwar2,
    shalwarGherra1: r.shalwar_gherra1, shalwarGherra2: r.shalwar_gherra2,
    shalwarAssan1: r.shalwar_assan1, shalwarAssan2: r.shalwar_assan2,
    shalwarPancha1: r.shalwar_pancha1, shalwarPancha2: r.shalwar_pancha2,
    frontPocket:   r.front_pocket, sidePocket: r.side_pocket, shalwarPocket: r.shalwar_pocket,
    zipCb:         r.zip_cb,
    // Trouser
    trouserdata1:  r.trouserdata1, trouserdata2: r.trouserdata2, trouserdata3: r.trouserdata3,
    trouserdata4:  r.trouserdata4, trouserdata5: r.trouserdata5, trouserdata6: r.trouserdata6,
    trouserdata7:  r.trouserdata7, trouserdata8: r.trouserdata8, trouserdata9: r.trouserdata9,
    trouserdata10: r.trouserdata10, trouserdata11: r.trouserdata11, trouserdata12: r.trouserdata12,
    trouserdata13: r.trouserdata13, trouserdata14: r.trouserdata14,
    // Ladies
    ladGolai1:     r.lad_golai1, ladGolai2: r.lad_golai2,
    ladMori1:      r.lad_mori1, ladMori2: r.lad_mori2,
    ladBellbazoo1: r.lad_bellbazoo1, ladBellbazoo2: r.lad_bellbazoo2,
    ladChaak1:     r.lad_chaak1, ladChaak2: r.lad_chaak2,
    ladHip1:       r.lad_hip1, ladHip2: r.lad_hip2,
    ladSimpleShalwar1: r.lad_simple_shalwar1, ladSimpleShalwar2: r.lad_simple_shalwar2,
    ladSimpleShalwarPancha1: r.lad_simple_shalwar_pancha1, ladSimpleShalwarPancha2: r.lad_simple_shalwar_pancha2,
    ladSimpleShalwarGherra1: r.lad_simple_shalwar_gherra1, ladSimpleShalwarGherra2: r.lad_simple_shalwar_gherra2,
    ladLasticSimpleShalwar: r.lad_lastic_simple_shalwar,
    ladShalwarBelt1: r.lad_shalwar_belt1, ladShalwarBelt2: r.lad_shalwar_belt2,
    ladShalwarBeltPancha1: r.lad_shalwar_belt_pancha1, ladShalwarBeltPancha2: r.lad_shalwar_belt_pancha2,
    ladShalwarBeltGherra1: r.lad_shalwar_belt_gherra1, ladShalwarBeltGherra2: r.lad_shalwar_belt_gherra2,
    ladLasticShalwarBelt: r.lad_lastic_shalwar_belt,
    ladTrouserdata15: r.lad_trouserdata15, ladTrouserdata16: r.lad_trouserdata16,
    ladTrouserElastic1: r.lad_trouser_elastic1,
    createdAt:     r.created_at,
  }))

  return NextResponse.json({ records })
}
