import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function test() {
  const profile = await prisma.measurementProfile.findFirst({
    where: { source: 'order' }
  })
  
  if (!profile) {
    console.log("No profile found")
    return
  }
  
  console.log("Found profile:", profile.id, profile.status)
  
  try {
    const updated = await prisma.measurementProfile.update({
      where: { id: profile.id },
      data: { status: 'approved' }
    })
    console.log("Successfully updated to:", updated.status)
  } catch(e) {
    console.error("Prisma error:", e)
  }
}

test().finally(() => prisma.$disconnect())
