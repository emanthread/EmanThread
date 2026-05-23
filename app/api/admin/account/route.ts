import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).optional(),
});

export const GET = withLoggedAdminHandler(async () => {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error("Get account error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const PUT = withLoggedAdminHandler(async (req: Request) => {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = updateAccountSchema.parse(body);

    // Verify current password
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Google-only accounts cannot update password
    if (!user.passwordHash) {
      return NextResponse.json({ error: "Cannot change password for Google-linked accounts" }, { status: 400 });
    }

    const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    // Update data
    const updateData: Record<string, string> = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.newPassword) {
      updateData.passwordHash = await bcrypt.hash(data.newPassword, 12);
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true },
    });

    // Audit log
    void createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      action: "SETTINGS_CHANGED",
      entity: "AdminAccount",
      newValue: { changedFields: Object.keys(updateData).filter(k => k !== "passwordHash") },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    console.error("Update account error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
});