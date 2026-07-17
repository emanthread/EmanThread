import { NextRequest, NextResponse } from "next/server";
import { getAdminCustomers } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from '@/lib/utils/errors';
import { requireAdminApiAccess } from "@/lib/admin-route-guard";

export const dynamic = "force-dynamic";

export const GET = withLoggedAdminHandler(async (req: NextRequest) => {
  try {
    const access = await requireAdminApiAccess(req);
    if (!access.ok) return access.response;

    // Support server-side pagination and search
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const result = await getAdminCustomers({ page, limit, search, status });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin customers error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});

export const POST = withLoggedAdminHandler(async (req: NextRequest) => {
  try {
    const access = await requireAdminApiAccess(req);
    if (!access.ok) return access.response;
    const session = access.session;
    const { hasPermission } = await import("@/lib/permissions");
    if (!hasPermission(session.user.role, "MANAGE_CUSTOMERS", session.user.permissions)) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, email, phone, city } = await req.json();

    if (!email || !name) {
      return NextResponse.json({ error: "Name and Email are required" }, { status: 400 });
    }

    const { prisma } = await import("@/lib/db");
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Create user
    const userData: any = {
      name,
      email,
      phone,
      role: "CUSTOMER",
      isVerified: true,
      isAdminCreated: true,
    };

    if (city) {
      userData.addresses = {
        create: {
          label: "Default",
          fullName: name,
          phone: phone || "",
          address: "",
          city,
          province: "",
          postalCode: "",
          isDefault: true,
        }
      };
    }

    const newUser = await prisma.user.create({
      data: userData,
    });

    // Generate token and send email
    const { generateToken, sendPasswordResetEmail } = await import("@/lib/email");
    const token = generateToken(48);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: newUser.id,
        expiresAt,
      },
    });

    const emailResult = await sendPasswordResetEmail(email, token);
    if (!emailResult.success) {
      console.error("[admin/customers] Failed to send password reset email:", emailResult.error);
      await prisma.passwordResetToken.deleteMany({
        where: { userId: newUser.id },
      });
      await prisma.user.delete({
        where: { id: newUser.id },
      });
      return NextResponse.json(
        { error: "Customer was not created because the password setup email could not be sent." },
        { status: 502 }
      );
    }

    // Log the creation
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "USER_REGISTER",
        entity: "Customer",
        entityId: newUser.id,
        newValue: { targetUserEmail: newUser.email, adminCreated: true },
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error) {
    console.error("Error creating customer:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
