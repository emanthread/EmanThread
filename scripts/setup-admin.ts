import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "emanthread@gmail.com";
  const password = "Eman456@";
  const name = "Eman Thread Admin";

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Update existing user to ADMIN
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { email },
      data: {
        name,
        passwordHash,
        role: "ADMIN",
        isVerified: true,
      },
    });
    console.log(`Updated existing user ${email} to ADMIN role.`);
  } else {
    // Create new ADMIN user
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "ADMIN",
        isVerified: true,
      },
    });
    console.log(`Created new ADMIN user: ${email}`);
  }

  // Verify
  const verify = await prisma.user.findUnique({
    where: { email },
    select: { email: true, role: true, isVerified: true },
  });
  console.log("Result:", JSON.stringify(verify, null, 2));
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });