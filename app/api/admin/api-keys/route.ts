import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, generateApiKey } from "@/lib/api-guards";
import { createApiKeySchema } from "@/lib/validators/api-keys";
import { withLoggedAdminHandler } from "@/lib/logger";

export const dynamic = "force-dynamic";

export const GET = withLoggedAdminHandler(async () => {
  try {
    const session = await requireAdmin();

    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        permissions: true,
        createdBy: true,
        lastUsedAt: true,
        active: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      keys.map((k) => ({
        id: k.id,
        name: k.name,
        permissions: JSON.parse(k.permissions || "[]"),
        createdBy: k.createdBy,
        lastUsedAt: k.lastUsedAt?.toISOString() || null,
        active: k.active,
        createdAt: k.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Forbidden")
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("List API keys error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

export const POST = withLoggedAdminHandler(async (req: Request) => {
  try {
    const session = await requireAdmin();

    const body = await req.json();
    const result = createApiKeySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, permissions } = result.data;
    const { fullKey, hash } = generateApiKey();

    const key = await prisma.apiKey.create({
      data: {
        name,
        keyHash: hash,
        permissions: JSON.stringify(permissions),
        createdBy: session.user.id || "admin",
      },
    });

    return NextResponse.json(
      {
        id: key.id,
        name: key.name,
        key: fullKey, // shown ONCE — never retrievable again
        permissions,
        createdAt: key.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Forbidden")
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    console.error("Create API key error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
