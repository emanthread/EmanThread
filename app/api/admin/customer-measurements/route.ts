import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { adminLimitParam, adminPageParam } from '@/lib/admin-pagination'

export const dynamic = 'force-dynamic'

const isAdmin = (role?: string | null) =>
  ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(role ?? '')

// ── GET /api/admin/customer-measurements ────────────────────────────────────
// List & search customer measurements. Supports ?phone=&name=&page=&limit=
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const phone  = searchParams.get('phone')?.trim()  || ''
  const name   = searchParams.get('name')?.trim()   || ''
  const search = searchParams.get('search')?.trim()  || ''
  const page   = adminPageParam(searchParams.get('page'))
  const limit  = adminLimitParam(searchParams.get('limit'), 20)
  const skip   = (page - 1) * limit

  // Build WHERE clause for raw query
  const conditions: string[] = [`"deleted_at" IS NULL`]
  const values: (string | number)[] = []
  let paramIdx = 1

  if (search && search.length >= 3) {
    conditions.push(`("phone" ILIKE $${paramIdx} OR "customer_name" ILIKE $${paramIdx + 1})`)
    values.push(`%${search}%`, `%${search}%`)
    paramIdx += 2
  } else {
    if (phone) {
      conditions.push(`"phone" ILIKE $${paramIdx}`)
      values.push(`%${phone}%`)
      paramIdx++
    }
    if (name) {
      conditions.push(`"customer_name" ILIKE $${paramIdx}`)
      values.push(`%${name}%`)
      paramIdx++
    }
  }

  const whereClause = conditions.join(' AND ')

  const [records, countResult] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(
      `SELECT "id", "phone", "customer_name", "garment_type", "gender", "created_at", "updated_at" FROM "customer_measurements" WHERE ${whereClause} ORDER BY "created_at" DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      ...values, limit, skip
    ),
    prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*) as count FROM "customer_measurements" WHERE ${whereClause}`,
      ...values
    ),
  ])

  const total = Number(countResult[0]?.count ?? 0)

  return NextResponse.json({ records, total, page, limit })
}

// ── POST /api/admin/customer-measurements ───────────────────────────────────
// Create a new customer measurement entry
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()

  if (!body.phone?.trim()) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
  }
  if (!body.customerName?.trim()) {
    return NextResponse.json({ error: 'Customer name is required' }, { status: 400 })
  }

  // Sanitize & build column list dynamically from allowed fields
  const allowed = [
    'phone', 'customer_name', 'garment_type', 'gender', 'notes',
    'length1','length2','shoulder1','shoulder2','chest1','chest2',
    'waist1','waist2','gherra1','gherra2','neck1','neck2',
    'sleeves1','sleeves2','golai1','golai2','armcuff1','armcuff2',
    'armplate1','armplate2','golbazoo1','golbazoo2','armpatti1','armpatti2',
    'collarnok1','collarnok2','bane1','bane2','hip1','hip2',
    'double_cb','single_cb','gol_cb','choras_cb','bane_cb','collar_cb',
    'roundneck','straight_cb','down_cb',
    'shalwar1','shalwar2','shalwar_gherra1','shalwar_gherra2',
    'shalwar_assan1','shalwar_assan2','shalwar_pancha1','shalwar_pancha2',
    'front_pocket','side_pocket','shalwar_pocket','zip_cb',
    'trouserdata1','trouserdata2','trouserdata3','trouserdata4','trouserdata5',
    'trouserdata6','trouserdata7','trouserdata8','trouserdata9','trouserdata10',
    'trouserdata11','trouserdata12','trouserdata13','trouserdata14',
    'lad_golai1','lad_golai2','lad_mori1','lad_mori2',
    'lad_bellbazoo1','lad_bellbazoo2','lad_chaak1','lad_chaak2',
    'lad_hip1','lad_hip2',
    'lad_simple_shalwar1','lad_simple_shalwar2',
    'lad_simple_shalwar_pancha1','lad_simple_shalwar_pancha2',
    'lad_simple_shalwar_gherra1','lad_simple_shalwar_gherra2',
    'lad_lastic_simple_shalwar',
    'lad_shalwar_belt1','lad_shalwar_belt2',
    'lad_shalwar_belt_pancha1','lad_shalwar_belt_pancha2',
    'lad_shalwar_belt_gherra1','lad_shalwar_belt_gherra2',
    'lad_lastic_shalwar_belt','lad_trouserdata15','lad_trouserdata16',
    'lad_trouser_elastic1',
  ]

  // Map camelCase body keys → snake_case columns
  const camelToSnake: Record<string, string> = {
    phone:             'phone',
    customerName:      'customer_name',
    garmentType:       'garment_type',
    gender:            'gender',
    notes:             'notes',
    length1:           'length1', length2: 'length2',
    shoulder1:         'shoulder1', shoulder2: 'shoulder2',
    chest1:            'chest1', chest2: 'chest2',
    waist1:            'waist1', waist2: 'waist2',
    gherra1:           'gherra1', gherra2: 'gherra2',
    neck1:             'neck1', neck2: 'neck2',
    sleeves1:          'sleeves1', sleeves2: 'sleeves2',
    golai1:            'golai1', golai2: 'golai2',
    armcuff1:          'armcuff1', armcuff2: 'armcuff2',
    armplate1:         'armplate1', armplate2: 'armplate2',
    golbazoo1:         'golbazoo1', golbazoo2: 'golbazoo2',
    armpatti1:         'armpatti1', armpatti2: 'armpatti2',
    collarnok1:        'collarnok1', collarnok2: 'collarnok2',
    bane1:             'bane1', bane2: 'bane2',
    hip1:              'hip1', hip2: 'hip2',
    doubleCb:          'double_cb', singleCb: 'single_cb',
    golCb:             'gol_cb', chorasCb: 'choras_cb',
    baneCb:            'bane_cb', collarCb: 'collar_cb',
    roundneck:         'roundneck', straightCb: 'straight_cb', downCb: 'down_cb',
    shalwar1:          'shalwar1', shalwar2: 'shalwar2',
    shalwarGherra1:    'shalwar_gherra1', shalwarGherra2: 'shalwar_gherra2',
    shalwarAssan1:     'shalwar_assan1', shalwarAssan2: 'shalwar_assan2',
    shalwarPancha1:    'shalwar_pancha1', shalwarPancha2: 'shalwar_pancha2',
    frontPocket:       'front_pocket', sidePocket: 'side_pocket', shalwarPocket: 'shalwar_pocket',
    zipCb:             'zip_cb',
    trouserdata1:      'trouserdata1', trouserdata2: 'trouserdata2', trouserdata3: 'trouserdata3',
    trouserdata4:      'trouserdata4', trouserdata5: 'trouserdata5', trouserdata6: 'trouserdata6',
    trouserdata7:      'trouserdata7', trouserdata8: 'trouserdata8', trouserdata9: 'trouserdata9',
    trouserdata10:     'trouserdata10', trouserdata11: 'trouserdata11', trouserdata12: 'trouserdata12',
    trouserdata13:     'trouserdata13', trouserdata14: 'trouserdata14',
    ladGolai1:         'lad_golai1', ladGolai2: 'lad_golai2',
    ladMori1:          'lad_mori1', ladMori2: 'lad_mori2',
    ladBellbazoo1:     'lad_bellbazoo1', ladBellbazoo2: 'lad_bellbazoo2',
    ladChaak1:         'lad_chaak1', ladChaak2: 'lad_chaak2',
    ladHip1:           'lad_hip1', ladHip2: 'lad_hip2',
    ladSimpleShalwar1: 'lad_simple_shalwar1', ladSimpleShalwar2: 'lad_simple_shalwar2',
    ladSimpleShalwarPancha1: 'lad_simple_shalwar_pancha1', ladSimpleShalwarPancha2: 'lad_simple_shalwar_pancha2',
    ladSimpleShalwarGherra1: 'lad_simple_shalwar_gherra1', ladSimpleShalwarGherra2: 'lad_simple_shalwar_gherra2',
    ladLasticSimpleShalwar:  'lad_lastic_simple_shalwar',
    ladShalwarBelt1:         'lad_shalwar_belt1', ladShalwarBelt2: 'lad_shalwar_belt2',
    ladShalwarBeltPancha1:   'lad_shalwar_belt_pancha1', ladShalwarBeltPancha2: 'lad_shalwar_belt_pancha2',
    ladShalwarBeltGherra1:   'lad_shalwar_belt_gherra1', ladShalwarBeltGherra2: 'lad_shalwar_belt_gherra2',
    ladLasticShalwarBelt:    'lad_lastic_shalwar_belt',
    ladTrouserdata15:        'lad_trouserdata15', ladTrouserdata16: 'lad_trouserdata16',
    ladTrouserElastic1:      'lad_trouser_elastic1',
  }

  const cols: string[] = []
  const vals: string[] = []
  const params: unknown[] = []
  let idx = 1

  for (const [camel, snake] of Object.entries(camelToSnake)) {
    if (body[camel] !== undefined && allowed.includes(snake)) {
      cols.push(`"${snake}"`)
      vals.push(`$${idx}`)
      params.push(String(body[camel] ?? ''))
      idx++
    }
  }

  if (cols.length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }

  const sql = `INSERT INTO "customer_measurements" (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING *`
  const result = await prisma.$queryRawUnsafe<any[]>(sql, ...params)

  return NextResponse.json({ record: result[0] }, { status: 201 })
}
