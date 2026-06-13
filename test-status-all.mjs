import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function test() {
  const profiles = await prisma.measurementProfile.findMany({
    where: { source: 'order' },
    select: { id: true, status: true, profileName: true }
  })
  console.log(profiles)
}

test().finally(() => prisma.$disconnect())
