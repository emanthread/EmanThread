import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/db-queries";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateToken, sendVerificationEmail } from "@/lib/email";
import { validateCsrf } from "@/lib/csrf";

export const dynamic = "force-dynamic";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  try {
    await validateCsrf(req);
    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // FIXED: L3 — don't reveal whether email is registered
      if (!existingUser.isVerified) {
        return NextResponse.json(
          { message: "If your email is registered, check your inbox for a verification email." },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { message: "If your email is registered, you can sign in or reset your password." },
        { status: 200 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "CUSTOMER",
      },
    });

    // Generate email verification token (valid for 24 hours)
    const verificationToken = generateToken(48);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: {
        token: verificationToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Send verification email — await so we can propagate failure
    const emailResult = await sendVerificationEmail(email, verificationToken);

    if (!emailResult.success) {
      console.error("[register] Failed to send verification email:", emailResult.error);
      // Rollback: remove the user account since verification email failed
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again." },
        { status: 500 }
      );
    }

    // Fire-and-forget audit log
    void createAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: "USER_REGISTER",
      entity: "User",
      entityId: user.id,
      newValue: { name: user.name, email: user.email },
    });

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
