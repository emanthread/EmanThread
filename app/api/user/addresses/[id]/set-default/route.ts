import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { validateCsrf } from "@/lib/csrf";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  try {
    await validateCsrf(req);
  } catch {
    return NextResponse.json({ error: "Forbidden: invalid CSRF token" }, { status: 403 });
  }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  // Unset all existing defaults for this user, then set the new one
  await prisma.address.updateMany({
    where: { userId: session.user.id, isDefault: true },
    data: { isDefault: false },
  });

  const updated = await prisma.address.update({
    where: { id },
    data: { isDefault: true },
  });

  return NextResponse.json(updated);
}