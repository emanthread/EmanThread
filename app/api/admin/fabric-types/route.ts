import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/permissions";
import { withLoggedAdminHandler } from "@/lib/logger";

export const dynamic = "force-dynamic";

const createFabricTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
});

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return false;
  }
  return true;
}

export const GET = withLoggedAdminHandler(async (req: Request) => {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const activeOnly = new URL(req.url).searchParams.get("active") === "true";
  const fabricTypes = await prisma.fabricType.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { name: "asc" },
    ...(activeOnly
      ? { select: { id: true, name: true, isActive: true } }
      : {}),
  });
  return NextResponse.json(fabricTypes);
});

export const POST = withLoggedAdminHandler(async (req: Request) => {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const result = createFabricTypeSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.errors[0].message },
      { status: 400 }
    );
  }

  const fabricType = await prisma.fabricType.create({
    data: {
      name: result.data.name,
      slug: result.data.slug,
      description: result.data.description || null,
    },
  });

  return NextResponse.json(fabricType, { status: 201 });
});
