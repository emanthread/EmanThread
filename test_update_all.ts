import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const all = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "customer_measurements" WHERE "deleted_at" IS NULL LIMIT 1`)
  if (!all.length) {
    console.log("No measurements found to test")
    return
  }
  const row = all[0]
  const id = row.id

  const camelToSnake: Record<string, string> = {
    phone: 'phone', customerName: 'customer_name',
    garmentType: 'garment_type', gender: 'gender', notes: 'notes',
    length1: 'length1', length2: 'length2',
    shoulder1: 'shoulder1', shoulder2: 'shoulder2',
    chest1: 'chest1', chest2: 'chest2',
    waist1: 'waist1', waist2: 'waist2',
    gherra1: 'gherra1', gherra2: 'gherra2',
    neck1: 'neck1', neck2: 'neck2',
    sleeves1: 'sleeves1', sleeves2: 'sleeves2',
    golai1: 'golai1', golai2: 'golai2',
    armcuff1: 'armcuff1', armcuff2: 'armcuff2',
    armplate1: 'armplate1', armplate2: 'armplate2',
    golbazoo1: 'golbazoo1', golbazoo2: 'golbazoo2',
    armpatti1: 'armpatti1', armpatti2: 'armpatti2',
    collarnok1: 'collarnok1', collarnok2: 'collarnok2',
    bane1: 'bane1', bane2: 'bane2',
    hip1: 'hip1', hip2: 'hip2',
    doubleCb: 'double_cb', singleCb: 'single_cb',
    golCb: 'gol_cb', chorasCb: 'choras_cb',
    baneCb: 'bane_cb', collarCb: 'collar_cb',
    roundneck: 'roundneck', straightCb: 'straight_cb', downCb: 'down_cb',
    shalwar1: 'shalwar1', shalwar2: 'shalwar2',
    shalwarGherra1: 'shalwar_gherra1', shalwarGherra2: 'shalwar_gherra2',
    shalwarAssan1: 'shalwar_assan1', shalwarAssan2: 'shalwar_assan2',
    shalwarPancha1: 'shalwar_pancha1', shalwarPancha2: 'shalwar_pancha2',
    frontPocket: 'front_pocket', sidePocket: 'side_pocket', shalwarPocket: 'shalwar_pocket',
    zipCb: 'zip_cb',
    trouserdata1: 'trouserdata1', trouserdata2: 'trouserdata2', trouserdata3: 'trouserdata3',
    trouserdata4: 'trouserdata4', trouserdata5: 'trouserdata5', trouserdata6: 'trouserdata6',
    trouserdata7: 'trouserdata7', trouserdata8: 'trouserdata8', trouserdata9: 'trouserdata9',
    trouserdata10: 'trouserdata10', trouserdata11: 'trouserdata11', trouserdata12: 'trouserdata12',
    trouserdata13: 'trouserdata13', trouserdata14: 'trouserdata14',
    ladGolai1: 'lad_golai1', ladGolai2: 'lad_golai2',
    ladMori1: 'lad_mori1', ladMori2: 'lad_mori2',
    ladBellbazoo1: 'lad_bellbazoo1', ladBellbazoo2: 'lad_bellbazoo2',
    ladChaak1: 'lad_chaak1', ladChaak2: 'lad_chaak2',
    ladHip1: 'lad_hip1', ladHip2: 'lad_hip2',
    ladSimpleShalwar1: 'lad_simple_shalwar1', ladSimpleShalwar2: 'lad_simple_shalwar2',
    ladSimpleShalwarPancha1: 'lad_simple_shalwar_pancha1', ladSimpleShalwarPancha2: 'lad_simple_shalwar_pancha2',
    ladSimpleShalwarGherra1: 'lad_simple_shalwar_gherra1', ladSimpleShalwarGherra2: 'lad_simple_shalwar_gherra2',
    ladLasticSimpleShalwar: 'lad_lastic_simple_shalwar',
    ladShalwarBelt1: 'lad_shalwar_belt1', ladShalwarBelt2: 'lad_shalwar_belt2',
    ladShalwarBeltPancha1: 'lad_shalwar_belt_pancha1', ladShalwarBeltPancha2: 'lad_shalwar_belt_pancha2',
    ladShalwarBeltGherra1: 'lad_shalwar_belt_gherra1', ladShalwarBeltGherra2: 'lad_shalwar_belt_gherra2',
    ladLasticShalwarBelt: 'lad_lastic_shalwar_belt',
    ladTrouserdata15: 'lad_trouserdata15', ladTrouserdata16: 'lad_trouserdata16',
    ladTrouserElastic1: 'lad_trouser_elastic1',
  }

  const setClauses: string[] = []
  const values: unknown[] = []
  let idx = 1

  // simulate payload
  for (const [camel, snake] of Object.entries(camelToSnake)) {
    setClauses.push(`"${snake}" = $${idx}`)
    values.push(row[snake] ?? '')
    idx++
  }

  values.push(id)
  const sql = `UPDATE "customer_measurements" SET ${setClauses.join(', ')} WHERE "id" = $${idx} AND "deleted_at" IS NULL RETURNING *`
  
  try {
    const result = await prisma.$queryRawUnsafe<any[]>(sql, ...values)
    console.log("Result length:", result.length)
  } catch (e) {
    console.error("ERROR:", e)
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
