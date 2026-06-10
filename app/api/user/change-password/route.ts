import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/db-queries";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateCsrf } from "@/lib/csrf";

export const dynamic = "force-dynamic";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter") // L7
    .regex(/[0-9]/, "Password must contain at least one number"), // L7
});

export async function PUT(req: Request) {
  const session = await auth();
  try {
    await validateCsrf(req);
  } catch {
    return NextResponse.json({ error: "Forbidden: invalid CSRF token" }, { status: 403 });
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = changePasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = result.data;

    // Get the user's current password hash
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Google-only accounts cannot change password
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Cannot change password for Google-linked accounts" },
        { status: 400 }
      );
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password and invalidate all existing sessions
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash, tokenVersion: { increment: 1 } }, // C1: invalidate all sessions
    });

    // Audit log (O12.6: password changes were not logged)
    void createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      action: "SETTINGS_CHANGED",
      entity: "User",
      entityId: session.user.id,
    });

    return NextResponse.json({
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}