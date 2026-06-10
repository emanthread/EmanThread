import { prisma } from "@/lib/db";

// ── Stitching Order helpers ────────────────────────────────────────

function generateStitchingOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ST-${dateStr}-${random}`;
}

export async function getStitchingOrders(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  tailorName?: string;
}) {
  const { page = 1, limit = 20, status, search, tailorName } = params;
  const where: any = {};
  if (status && status !== 'all') where.status = status;
  if (tailorName && tailorName !== 'all') {
    where.tailorName = { contains: tailorName, mode: 'insensitive' };
  }
  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: 'insensitive' } },
      { customerPhone: { contains: search } },
      { orderNumber: { contains: search } },
    ];
  }
  const [orders, total] = await Promise.all([
    prisma.stitchingOrder.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { dueDate: 'asc' },
    }),
    prisma.stitchingOrder.count({ where }),
  ]);
  return { orders, total, page, limit };
}

export async function getStitchingOrderById(id: string) {
  return prisma.stitchingOrder.findUnique({ where: { id } });
}

export async function createStitchingOrder(data: any, createdBy?: string) {
  return prisma.stitchingOrder.create({
    data: {
      ...data,
      orderNumber: generateStitchingOrderNumber(),
      dueDate: new Date(data.dueDate),
      totalPrice: data.totalPrice,
      advancePaid: data.advancePaid ?? 0,
      createdBy: createdBy ?? null,
    },
  });
}

export async function updateStitchingOrder(id: string, data: any) {
  const updateData: any = { ...data };
  if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
  return prisma.stitchingOrder.update({ where: { id }, data: updateData });
}

export async function deleteStitchingOrder(id: string) {
  return prisma.stitchingOrder.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function getStitchingStats() {
  const [total, pending, inProgress, completed, delivered] = await Promise.all([
    prisma.stitchingOrder.count(),
    prisma.stitchingOrder.count({ where: { status: 'PENDING' } }),
    prisma.stitchingOrder.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.stitchingOrder.count({ where: { status: 'COMPLETED' } }),
    prisma.stitchingOrder.count({ where: { status: 'DELIVERED' } }),
  ]);
  return { total, pending, inProgress, completed, delivered };
}

export async function getStitchingTailors(): Promise<string[]> {
  const result = await prisma.stitchingOrder.findMany({
    select: { tailorName: true },
    distinct: ['tailorName'],
    where: { tailorName: { not: null } },
  });
  return result.map((r) => r.tailorName).filter(Boolean) as string[];
}
