import type {} from 'next';

let adminGuardRan = false;

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (adminGuardRan) return;
    adminGuardRan = true;

    try {
      const { PrismaClient } = await import('@prisma/client');
      const bcryptLib = await import('bcrypt');
      const bcrypt = bcryptLib.default ?? bcryptLib;

      const prisma = new PrismaClient();

      const admin = await prisma.user.findUnique({
        where: { email: 'emanthread@gmail.com' },
        select: { role: true, isVerified: true, passwordHash: true },
      });

      if (!admin) {
        const hash = await bcrypt.hash('Eman456@', 12);
        await prisma.user.create({
          data: {
            email: 'emanthread@gmail.com',
            name: 'Eman Thread Admin',
            passwordHash: hash,
            role: 'ADMIN',
            isVerified: true,
          },
        });
        console.log('[STARTUP GUARD] Admin user was missing — recreated successfully.');
      } else if (admin.role !== 'ADMIN' || !admin.isVerified) {
        await prisma.user.update({
          where: { email: 'emanthread@gmail.com' },
          data: { role: 'ADMIN', isVerified: true },
        });
        console.log('[STARTUP GUARD] Admin role/verification was corrupted — restored.');
      }

      await prisma.$disconnect();
    } catch (err) {
      console.error('[STARTUP GUARD] Failed to verify admin user:', err);
    }
  }
}
