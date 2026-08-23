import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/db-queries";
import { requireAdminApiAccess } from "@/lib/admin-route-guard";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  prices: z.array(
    z.object({
      fabricType: z.string().trim().min(1).max(160),
      gender: z.enum(["Male", "Female"]),
      price: z.number().min(0, "Price cannot be negative"),
    })
  ).max(200),
}).superRefine(({ prices }, context) => {
  const keys = new Set<string>();
  prices.forEach((item, index) => {
    const key = `${item.fabricType.trim().toLocaleLowerCase("en-US")}:${item.gender}`;
    if (keys.has(key)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prices", index],
        message: "Each fabric and gender price can appear only once",
      });
    }
    keys.add(key);
  });
});

export async function GET(req: Request) {
  try {
    const access = await requireAdminApiAccess(req);
    if (!access.ok) return access.response;

    const prices = await prisma.stitchingPrice.findMany({
      orderBy: { fabricType: "asc" },
    });

    return NextResponse.json(
      prices.map((p) => ({
        id: p.id,
        fabricType: p.fabricType,
        gender: p.gender,
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
    const access = await requireAdminApiAccess(req);
    if (!access.ok) return access.response;
    const session = access.session;

    const body = await req.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { prices } = result.data;
    const updated = await prisma.$transaction(
      prices.map((item) => prisma.stitchingPrice.upsert({
        where: { fabricType_gender: { fabricType: item.fabricType, gender: item.gender } },
        update: { price: item.price },
        create: { fabricType: item.fabricType, gender: item.gender, price: item.price },
      }))
    );
    const updatedPrices = updated.map((item) => ({
      id: item.id,
      fabricType: item.fabricType,
      gender: item.gender,
      price: Number(item.price),
    }));

    // Audit log
    void createAuditLog({
        userId: session.user.id,
        userEmail: session.user.email || undefined,
        action: "SETTINGS_CHANGED",
        entity: "StitchingPrice",
        newValue: { prices },
      });

    return NextResponse.json(updatedPrices);
  } catch (error) {
    console.error("Update stitching prices error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
