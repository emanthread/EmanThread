import { prisma } from "@/lib/db";

async function fix() {
  const result = await prisma.user.update({
    where: { email: "emanthread@gmail.com" },
    data: { role: "ADMIN" },
  });
  console.log(`Fixed: ${result.email} → role: ${result.role}`);
  
  // Verify
  const verify = await prisma.user.findUnique({
    where: { email: "emanthread@gmail.com" },
    select: { email: true, role: true, isVerified: true, passwordHash: true },
  });
  console.log("Verification:", verify);
  
  await prisma.$disconnect();
}

fix().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});