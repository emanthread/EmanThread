import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { withLoggedAdminHandler } from "@/lib/logger";
import { hasPermission, type RoleValue } from "@/lib/permissions";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

export const DELETE = withLoggedAdminHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth();
  const userRole = session?.user?.role;
  const userPerms = session?.user?.permissions;
  const customPerms = userPerms ? JSON.stringify(userPerms) : undefined;

  if (
    !session?.user ||
    !hasPermission(userRole as RoleValue, "MANAGE_CUSTOMERS", customPerms)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Verify the user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Only customer accounts can be deleted from this page' }, { status: 403 });
    }

    // Nullify userId on orders to preserve order history
    await prisma.order.updateMany({
      where: { userId: id },
      data: { userId: null },
    });

    // Delete return request items associated with this user
    await prisma.returnRequestItem.deleteMany({
      where: { returnRequest: { userId: id } },
    });

    // Delete return requests associated with this user
    await prisma.returnRequest.deleteMany({
      where: { userId: id },
    });

    // Delete measurement profile (optional relation)
    await prisma.measurementProfile.deleteMany({
      where: { userId: id },
    });


    // Delete password reset tokens
    await prisma.passwordResetToken.deleteMany({
      where: { userId: id },
    });

    // Delete email verification tokens
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: id },
    });

    // Delete the user (Addresses and ProductReviews cascade via schema)
    await prisma.user.delete({
      where: { id },
    });

    // Audit log - use ADMIN_ACCESS as generic action (no specific CUSTOMER_DELETED in enum)
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email!,
        action: "ADMIN_ACCESS",
        entity: "Customer",
        entityId: user.email,
        newValue: { action: "CUSTOMER_DELETED", deletedCustomerId: id, deletedCustomerName: user.name },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete customer error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
