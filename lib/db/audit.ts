import { prisma } from "@/lib/db";
import { after } from "next/server";

export function createAuditLog(data: {
  userId?: string;
  userEmail?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: object;
  newValue?: object;
  ipAddress?: string;
  userAgent?: string;
}) {
  after(async () => {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId ?? null,
          userEmail: data.userEmail ?? null,
          action: data.action as any,
          entity: data.entity,
          entityId: data.entityId ?? null,
          oldValue: data.oldValue ? (JSON.parse(JSON.stringify(data.oldValue)) as any) : null,
          newValue: data.newValue ? (JSON.parse(JSON.stringify(data.newValue)) as any) : null,
          ipAddress: data.ipAddress ?? null,
          userAgent: data.userAgent ?? null,
        },
      });
    } catch (err) {
      console.error("[audit] Failed to create audit log:", err);
    }
  });
}

export async function getAuditLogs(options: {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  entity?: string;
  from?: Date;
  to?: Date;
}) {
  const { page = 1, limit = 50, userId, action, entity, from, to } = options;
  const skip = (page - 1) * limit;
  const where: any = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entity) where.entity = entity;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return {
    logs: logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userEmail: log.userEmail,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      oldValue: log.oldValue,
      newValue: log.newValue,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}

export async function deleteAuditLog(id: string) {
  await prisma.auditLog.delete({ where: { id } });
}

export async function clearAllAuditLogs() {
  await prisma.auditLog.deleteMany();
}
