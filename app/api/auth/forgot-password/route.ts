import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateToken, sendPasswordResetEmail } from "@/lib/email";
import { validateCsrf } from "@/lib/csrf";

export const dynamic = "force-dynamic";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(req: Request) {
  try {
    await validateCsrf(req);
    const body = await req.json();
    const result = forgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // Find user — don't reveal whether the email exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return success to avoid email enumeration
      return NextResponse.json({
        message: "If that email is registered, you will receive password reset instructions.",
      });
    }

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate new token valid for 1 hour
    const token = generateToken(48);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Send email — await so we can propagate failure
    const emailResult = await sendPasswordResetEmail(email, token);

    if (!emailResult.success) {
      console.error("[forgot-password] Failed to send email:", emailResult.error);
      return NextResponse.json(
        { error: "Failed to send password reset email. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "If that email is registered, you will receive password reset instructions.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}