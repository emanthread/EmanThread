import { prisma } from "@/lib/db";

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "emanthread@gmail.com" },
    select: { email: true, role: true, isVerified: true, passwordHash: true },
  });
  
  if (!user) {
    console.log("❌ emanthread@gmail.com NOT FOUND — was deleted");
    process.exit(1);
  }
  
  console.log(`email: ${user.email}`);
  console.log(`role: ${user.role}`);
  console.log(`isVerified: ${user.isVerified}`);
  console.log(`hasPassword: ${!!user.passwordHash}`);
  
  if (user.role !== "ADMIN" || !user.isVerified || !user.passwordHash) {
    console.log("❌ USER HAS ISSUES");
    process.exit(1);
  }
  
  console.log("✅ ALL CHECKS PASSED");
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });