import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

const updateProfileSchema = z.object({
  whatsappConsent: z.boolean().optional(),
  whatsappPhone: z.string().optional(),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
});

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { addresses: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || undefined,
    whatsappConsent: user.whatsappConsent,
    whatsappPhone: user.whatsappPhone || undefined,
    role: user.role,
    isVerified: user.isVerified,
    addresses: user.addresses.map((addr) => ({
      id: addr.id,
      label: addr.label,
      fullName: addr.fullName,
      phone: addr.phone,
      address: addr.address,
      city: addr.city,
      province: addr.province,
      postalCode: addr.postalCode,
      isDefault: addr.isDefault,
    })),
    createdAt: user.createdAt.toISOString(),
  });
}

export async function PUT(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = updateProfileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { whatsappConsent, whatsappPhone, name, phone } = result.data;

    const updateData: Record<string, unknown> = {};
    if (whatsappConsent !== undefined) updateData.whatsappConsent = whatsappConsent;
    if (whatsappPhone !== undefined) updateData.whatsappPhone = whatsappPhone || null;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      include: { addresses: true },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || undefined,
      whatsappConsent: user.whatsappConsent,
      whatsappPhone: user.whatsappPhone || undefined,
      role: user.role,
      isVerified: user.isVerified,
      addresses: user.addresses.map((addr) => ({
        id: addr.id,
        label: addr.label,
        fullName: addr.fullName,
        phone: addr.phone,
        address: addr.address,
        city: addr.city,
        province: addr.province,
        postalCode: addr.postalCode,
        isDefault: addr.isDefault,
      })),
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Update profile error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
