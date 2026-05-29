import { prisma } from "@/lib/db";

async function diagnose() {
  const emails = ["emanthread@gmail.com", "admin@emanthread.com"];

  for (const email of emails) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        passwordHash: true,
        tokenVersion: true,
        createdAt: true,
      },
    });

    if (!user) {
      console.log(`\n❌ User "${email}" — NOT FOUND`);
      continue;
    }

    console.log(`\n══════════════════════════════════════`);
    console.log(`  User: ${email}`);
    console.log(`  Role:        ${user.role}`);
    console.log(`  isVerified:  ${user.isVerified}`);
    console.log(`  tokenVersion: ${user.tokenVersion}`);
    console.log(`  Has password: ${user.passwordHash ? "✅ YES" : "❌ NO"}`);
    console.log(`  ID:          ${user.id}`);

    const issues: string[] = [];

    if (!user.isVerified) {
      issues.push(`❌ isVerified is FALSE`);
    } else {
      console.log(`  ✅ isVerified is TRUE`);
    }

    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      issues.push(`❌ Role is "${user.role}" — expected ADMIN or SUPER_ADMIN`);
    } else {
      console.log(`  ✅ Role is "${user.role}"`);
    }

    if (!user.passwordHash) {
      issues.push(`❌ passwordHash is NULL`);
    } else {
      console.log(`  ✅ passwordHash is present`);
    }

    if (issues.length === 0) {
      console.log(`  ✅ ALL CHECKS PASSED — user should be able to log in\n`);
    } else {
      console.log(`\n  ❌ ISSUES:`);
      issues.forEach((i) => console.log(`     ${i}`));
      console.log();
    }
  }

  await prisma.$disconnect();
}

diagnose().catch((err) => {
  console.error("Diagnostic failed:", err);
  process.exit(1);
});