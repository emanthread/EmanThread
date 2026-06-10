import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/db-queries";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateCsrf } from "@/lib/csrf";

export const dynamic = "force-dynamic";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter") // L7
    .regex(/[0-9]/, "Password must contain at least one number"), // L7
});

export async function POST(req: Request) {
  try {
    await validateCsrf(req);
    const body = await req.json();
    const result = resetPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { token, password } = result.data;

    // Find the token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      // Clean up expired token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }).catch(() => {});
      return NextResponse.json(
        { error: "Reset token has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update user password, verify email (password reset proves ownership),
    // invalidate all existing sessions, and delete the token in a single transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash, isVerified: true, tokenVersion: { increment: 1 } }, // C1: invalidate all sessions
      }),
      prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
    ]);

    // Audit log (O12.6: password resets were not logged)
    void createAuditLog({
      userId: resetToken.userId,
      userEmail: resetToken.user.email,
      action: "SETTINGS_CHANGED",
      entity: "User",
      entityId: resetToken.userId,
    });

    return NextResponse.json({
      message: "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}