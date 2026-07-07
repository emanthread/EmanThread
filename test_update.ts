import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const all = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "customer_measurements" WHERE "deleted_at" IS NULL LIMIT 1`)
  if (!all.length) {
    console.log("No measurements found to test")
    return
  }
  const id = all[0].id
  console.log("Testing update on ID:", id, "deleted_at:", all[0].deleted_at)

  const sql = `UPDATE "customer_measurements" SET "customer_name" = $1 WHERE "id" = $2 AND "deleted_at" IS NULL RETURNING *`
  const result = await prisma.$queryRawUnsafe<any[]>(sql, all[0].customer_name + ' test', id)
  
  console.log("Result length:", result.length)
  console.log("Result:", result)
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
