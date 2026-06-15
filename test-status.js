import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const profile = await prisma.measurementProfile.findFirst({
    where: { source: 'order' }
  })
  
  if (!profile) {
    console.log('No profile found')
    return
  }
  
  console.log('Profile found:', profile.id, 'Current status:', profile.status)
  
  try {
    const updated = await prisma.measurementProfile.update({
      where: { id: profile.id },
      data: { status: 'rejected' }
    })
    console.log('Successfully updated to rejected. New status:', updated.status)
    
    // Revert back
    await prisma.measurementProfile.update({
      where: { id: profile.id },
      data: { status: profile.status }
    })
    console.log('Reverted.')
  } catch (err) {
    console.error('Error updating:', err)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
