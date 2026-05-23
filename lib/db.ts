import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    if (typeof window === "undefined") {
      console.error(
        "[db] Missing DATABASE_URL environment variable. Database queries will fail at runtime."
      );
    }
  }

  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Safely execute a Prisma query. Returns the result on success,
 * or logs the error and returns null on failure — preventing SSR crashes
 * when the database is unreachable.
 */
export async function safePrismaQuery<T>(
  fn: () => Promise<T>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown database error";
    console.error("[db] Prisma query failed:", message);
    return { data: null, error: message };
  }
}