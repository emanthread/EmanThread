import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { createAuditLog } from "@/lib/db-queries";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  prices: z.array(
    z.object({
      fabricType: z.string().min(1),
      price: z.number().positive("Price must be positive"),
    })
  ),
});

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role ?? "")) {
    return false;
  }
  return true;
}

export async function GET() {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const prices = await prisma.stitchingPrice.findMany({
      orderBy: { fabricType: "asc" },
    });

    return NextResponse.json(
      prices.map((p) => ({
        id: p.id,
        fabricType: p.fabricType,
        price: Number(p.price),
        updatedAt: p.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Get stitching prices error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { prices } = result.data;
    const updatedPrices = [];

    for (const item of prices) {
      const updated = await prisma.stitchingPrice.upsert({
        where: { fabricType: item.fabricType },
        update: { price: item.price },
        create: { fabricType: item.fabricType, price: item.price },
      });
      updatedPrices.push({
        id: updated.id,
        fabricType: updated.fabricType,
        price: Number(updated.price),
      });
    }

    // Audit log
    const auditSession = await auth();
    if (auditSession?.user) {
      void createAuditLog({
        userId: auditSession.user.id,
        userEmail: auditSession.user.email || undefined,
        action: "SETTINGS_CHANGED",
        entity: "StitchingPrice",
        newValue: { prices },
      });
    }

    return NextResponse.json(updatedPrices);
  } catch (error) {
    console.error("Update stitching prices error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}