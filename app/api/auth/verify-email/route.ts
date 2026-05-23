import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        new URL("/login?error=missing_token", req.url)
      );
    }

    // Find the verification token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken) {
      return NextResponse.redirect(
        new URL("/login?error=invalid_token", req.url)
      );
    }

    // Check if token is expired
    if (new Date() > verificationToken.expiresAt) {
      // Clean up expired token
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      }).catch(() => {});
      return NextResponse.redirect(
        new URL("/login?error=expired_token", req.url)
      );
    }

    const userName = verificationToken.user.name;

    // Verify the user and delete the token in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { isVerified: true },
      }),
      prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      }),
    ]);

    // Send welcome email (fire-and-forget)
    void sendWelcomeEmail(verificationToken.user.email, userName).catch((err) => {
      console.error("[verify-email] Failed to send welcome email:", err);
    });

    // Redirect to login with success
    return NextResponse.redirect(
      new URL("/login?verified=true", req.url)
    );
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(
      new URL("/login?error=verification_failed", req.url)
    );
  }
}