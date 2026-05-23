import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guards";
import { withLoggedAdminHandler } from "@/lib/logger";

export const dynamic = "force-dynamic";

export const DELETE = withLoggedAdminHandler(async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await requireAdmin();

    const { id } = await params;

    const key = await prisma.apiKey.findUnique({ where: { id } });
    if (!key) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    await prisma.apiKey.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ id, active: false });
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
    console.error("Delete API key error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
