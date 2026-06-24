import { isAdminRole } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAdminCustomers } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

export const GET = withLoggedAdminHandler(async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
    const session = await auth();
    // Assuming MANAGE_CUSTOMERS permission checks logic... Since no granular permissions are defined in this snippet, using isAdminRole.
    // However, the prompt mentioned: hasPermission(role, "MANAGE_CUSTOMERS").
    // Let's import hasPermission and check it.
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
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
