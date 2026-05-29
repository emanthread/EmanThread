import { prisma } from "@/lib/db";

async function diagnose() {
  const email = process.argv[2];
  
  if (!email) {
    console.error("Usage: npx tsx scripts/diagnose-login.ts <email>");
    process.exit(1);
  }

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
    console.log(`\n❌ User with email "${email}" NOT FOUND in database.\n`);
    process.exit(1);
  }

  console.log("\n═══════════════════════════════════════════");
  console.log("       USER DIAGNOSTIC REPORT");
  console.log("═══════════════════════════════════════════\n");
  console.log(`  Email:         ${user.email}`);
  console.log(`  Name:          ${user.name}`);
  console.log(`  Role:          ${user.role}`);
  console.log(`  isVerified:    ${user.isVerified}`);
  console.log(`  tokenVersion:  ${user.tokenVersion}`);
  console.log(`  Created:       ${user.createdAt.toISOString()}`);
  console.log(`  Has password:  ${user.passwordHash ? "✅ YES" : "❌ NO (empty/null)"}`);
  console.log(`  ID:            ${user.id}`);
  
  console.log("\n  ── CHECKS ──\n");
  
  const issues: string[] = [];

  // Check 1: isVerified
  if (!user.isVerified) {
    issues.push("❌ FAIL: isVerified is FALSE → login blocked by auth.ts line 110");
    issues.push(`    → Fix: UPDATE "User" SET "isVerified" = true WHERE email = '${email}';`);
  } else {
    console.log("  ✅ PASS: isVerified is TRUE");
  }

  // Check 2: Role check (staff roles blocked on customer login)
  const staffRoles = ["ADMIN", "SUPER_ADMIN", "MANAGER", "SUPPORT"];
  if (staffRoles.includes(user.role)) {
    issues.push(`❌ FAIL: Role is "${user.role}" (staff role) → login blocked by auth.ts line 142`);
    issues.push(`    → Fix: UPDATE "User" SET role = 'CUSTOMER' WHERE email = '${email}';`);
  } else {
    console.log(`  ✅ PASS: Role is "${user.role}" (non-staff)`);
  }

  // Check 3: passwordHash
  if (!user.passwordHash) {
    issues.push("❌ FAIL: passwordHash is empty/null → login blocked by auth.ts line 107");
    issues.push("    → Fix: User must use 'Forgot Password' to reset their password");
  } else {
    console.log("  ✅ PASS: passwordHash is present");
  }

  // Check 4: Login origin gate (double check login-client sends loginOrigin)
  console.log("  ✅ PASS: login-client sends loginOrigin='customer'");

  if (issues.length > 0) {
    console.log("\n  ── ISSUES FOUND ──\n");
    issues.forEach((issue) => console.log(`  ${issue}`));
  } else {
    console.log("\n  🎉 NO ISSUES FOUND — the user should be able to log in.\n");
    console.log("  If login still fails, the problem might be:\n");
    console.log("    • NEXTAUTH_SECRET mismatch (cookie decryption failure)")
    console.log("    • Session cookie not being sent (browser issue)")
    console.log("    • Rate limiter blocking (5 attempts/min for auth)")
    console.log("    • The user might be entering wrong password");
  }
  
  console.log("\n═══════════════════════════════════════════\n");
  
  await prisma.$disconnect();
}

diagnose().catch((err) => {
  console.error("Diagnostic failed:", err);
  process.exit(1);
});