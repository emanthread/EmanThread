import { PrismaClient } from "@prisma/client";

async function main() {
  const p = new PrismaClient();
  
  // Check user
  const u = await p.user.findUnique({
    where: { email: "emanthread@gmail.com" },
    select: { email: true, role: true, isVerified: true, passwordHash: true, tokenVersion: true },
  });
  
  if (!u) {
    console.log("USER DELETED");
    process.exit(1);
  }
  
  console.log("=== USER ===");
  console.log("email:", u.email);
  console.log("role:", u.role);
  console.log("isVerified:", u.isVerified);
  console.log("tokenVersion:", u.tokenVersion);
  console.log("hash present:", !!u.passwordHash);
  console.log("hash start:", u.passwordHash?.substring(0, 10));
  console.log("hash length:", u.passwordHash?.length);
  
  // Check if hash is valid bcrypt format
  if (u.passwordHash && !u.passwordHash.startsWith("$2")) {
    console.log("WARNING: passwordHash does NOT start with $2 (not valid bcrypt)");
  }
  
  await p.$disconnect();
}

main().catch(console.error);