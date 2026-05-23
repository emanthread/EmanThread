import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createAddressSchema = z.object({
  label: z.string().min(1, "Label is required"),
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "Province is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: { isDefault: "desc" },
  });

  return NextResponse.json(addresses);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = createAddressSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { label, fullName, phone, address, city, province, postalCode, isDefault } = result.data;

    // If new address is default, unset existing defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const created = await prisma.address.create({
      data: {
        userId: session.user.id,
        label,
        fullName,
        phone,
        address,
        city,
        province,
        postalCode,
        isDefault: isDefault ?? false,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Create address error:", error);
    return NextResponse.json(
      { error: "Failed to create address" },
      { status: 500 }
    );
  }
}