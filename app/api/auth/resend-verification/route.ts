import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateToken, sendVerificationEmail } from "@/lib/email";
import { validateCsrf } from "@/lib/csrf";

export const dynamic = "force-dynamic";

const resendSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(req: Request) {
  try {
    await validateCsrf(req);
    const body = await req.json();
    const result = resendSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email } = result.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Generic response to prevent account enumeration
    if (!user || user.isVerified) {
      return NextResponse.json(
        { message: "If an account with this email exists, a verification link has been sent." },
        { status: 200 }
      );
    }

    // Delete any existing verification tokens for this user
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate new token valid for 24 hours
    const verificationToken = generateToken(48);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: {
        token: verificationToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Send email and wait for result — propagate failure to the user
    const emailResult = await sendVerificationEmail(email, verificationToken);

    if (!emailResult.success) {
      console.error("[resend-verification] Failed to send email:", emailResult.error);
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Verification email sent. Please check your inbox.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}