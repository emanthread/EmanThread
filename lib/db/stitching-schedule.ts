import { prisma } from "@/lib/db";

// ── Stitching Delivery Date Scheduling ────────────────────────────────────────
//
// Logic:
//  1. Start from orderDate + leadDays (normalized to midnight in Asia/Karachi)
//  2. For each candidate day:
//     a. Check StitchingCalendarRule — is the day blocked? → skip
//     b. Get effective daily capacity (may be overridden by a rule)
//     c. Count Order rows with stitchingDeliveryDate == candidate AND stitchingFee > 0 AND status != CANCELLED
//     d. count < capacity? → assign it
//     e. else +1 day, repeat
//  3. Max search window: 60 days (safety valve)

/** Normalise a date to midnight PKT (UTC+5) as a UTC Date */
function toMidnightPKT(date: Date): Date {
  // PKT = UTC+5. We store dates in UTC so "midnight PKT" = UTC 19:00 previous day.
  // Strategy: work in local date components, produce a stable UTC anchor.
  const pktOffsetMs = 5 * 60 * 60 * 1000;
  const pktMs = date.getTime() + pktOffsetMs;
  const pktDate = new Date(pktMs);
  // Zero out time components
  pktDate.setUTCHours(0, 0, 0, 0);
  // Shift back to UTC
  return new Date(pktDate.getTime() - pktOffsetMs);
}

/** Add N whole days to a midnight-PKT date */
function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  return result;
}

/** Get the start and end UTC timestamps for a midnight-PKT day */
function dayBounds(midnightPkt: Date): { gte: Date; lt: Date } {
  return {
    gte: midnightPkt,
    lt: addDays(midnightPkt, 1),
  };
}

/**
 * Returns how many stitching orders are assigned to the given day.
 * Only counts non-cancelled orders where stitchingFee > 0.
 */
export async function getStitchingCountForDate(date: Date): Promise<number> {
  const { gte, lt } = dayBounds(date);
  const count = await prisma.order.count({
    where: {
      stitchingDeliveryDate: { gte, lt },
      stitchingFee: { gt: 0 },
      status: { not: "CANCELLED" },
    },
  });
  return count;
}

/**
 * Returns the effective daily stitching capacity for a given date.
 * - Returns null if the date is fully blocked (no deliveries allowed).
 * - Returns the threshold number if deliveries are permitted.
 * - Single-day rules take precedence over range rules.
 * - If multiple rules apply, the most restrictive wins (smallest capacity / block wins).
 */
export async function getEffectiveCapacityForDate(
  date: Date,
  defaultThreshold: number
): Promise<number | null> {
  const { gte, lt } = dayBounds(date);

  // Fetch all active rules that overlap this day
  const rules = await prisma.stitchingCalendarRule.findMany({
    where: {
      isActive: true,
      OR: [
        // Single-day rules
        {
          type: { in: ["BLOCKED_DATE", "CAPACITY_OVERRIDE"] },
          date: { gte, lt },
        },
        // Range rules that include this day
        {
          type: { in: ["BLOCKED_RANGE", "CAPACITY_RANGE"] },
          startDate: { lte: lt },
          endDate: { gte: gte },
        },
      ],
    },
  });

  if (rules.length === 0) return defaultThreshold;

  // Check for any blocking rule first
  const hasBlock = rules.some(
    (r) => r.type === "BLOCKED_DATE" || r.type === "BLOCKED_RANGE"
  );
  if (hasBlock) return null; // Day is blocked

  // Apply the minimum capacity override found
  const overrides = rules
    .filter(
      (r) =>
        (r.type === "CAPACITY_OVERRIDE" || r.type === "CAPACITY_RANGE") &&
        r.capacity !== null
    )
    .map((r) => r.capacity as number);

  if (overrides.length === 0) return defaultThreshold;
  return Math.min(...overrides);
}

/**
 * Main scheduling function.
 * Finds the first available stitching delivery date, starting at orderDate + leadDays.
 * Skips blocked days and fully-booked days.
 * Returns the calculated delivery date.
 */
export async function calculateStitchingDeliveryDate(
  orderDate: Date,
  defaultThreshold: number,
  leadDays: number
): Promise<Date> {
  const MAX_SEARCH_DAYS = 60;
  let candidate = toMidnightPKT(addDays(orderDate, leadDays));

  for (let i = 0; i < MAX_SEARCH_DAYS; i++) {
    const capacity = await getEffectiveCapacityForDate(candidate, defaultThreshold);
    if (capacity !== null) {
      // Day is not blocked — check how full it is
      const count = await getStitchingCountForDate(candidate);
      if (count < capacity) {
        return candidate; // Found a slot!
      }
    }
    // Day is blocked or full — try next day
    candidate = addDays(candidate, 1);
  }

  // Safety fallback — should never happen in practice
  return candidate;
}

/**
 * Fast delivery estimate for the public API (pre-order preview).
 * Same logic as calculateStitchingDeliveryDate but uses today as the base.
 */
export async function getDeliveryEstimate(
  leadDays: number,
  defaultThreshold: number
): Promise<Date> {
  return calculateStitchingDeliveryDate(new Date(), defaultThreshold, leadDays);
}

/**
 * Returns capacity info for each day in a given month.
 * Used by the admin calendar view.
 * month: "2026-07" format
 */
export async function getMonthCapacityMap(
  month: string,
  defaultThreshold: number
): Promise<
  Record<
    string,
    { count: number; capacity: number | null; blocked: boolean }
  >
> {
  const [year, mon] = month.split("-").map(Number);
  const startDate = toMidnightPKT(new Date(year, mon - 1, 1));
  const daysInMonth = new Date(year, mon, 0).getDate();

  const result: Record<
    string,
    { count: number; capacity: number | null; blocked: boolean }
  > = {};

  // Batch: fetch all stitching orders for the month in one query
  const endDate = addDays(startDate, daysInMonth);
  const orders = await prisma.order.findMany({
    where: {
      stitchingDeliveryDate: { gte: startDate, lt: endDate },
      stitchingFee: { gt: 0 },
      status: { not: "CANCELLED" },
    },
    select: { stitchingDeliveryDate: true },
  });

  // Build a count map
  const countMap: Record<string, number> = {};
  for (const o of orders) {
    if (!o.stitchingDeliveryDate) continue;
    const key = toMidnightPKT(o.stitchingDeliveryDate)
      .toISOString()
      .slice(0, 10);
    countMap[key] = (countMap[key] ?? 0) + 1;
  }

  // Fetch all active rules for this month
  const rules = await prisma.stitchingCalendarRule.findMany({
    where: {
      isActive: true,
      OR: [
        {
          type: { in: ["BLOCKED_DATE", "CAPACITY_OVERRIDE"] },
          date: { gte: startDate, lt: endDate },
        },
        {
          type: { in: ["BLOCKED_RANGE", "CAPACITY_RANGE"] },
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      ],
    },
  });

  for (let i = 0; i < daysInMonth; i++) {
    const day = addDays(startDate, i);
    const dayStr = day.toISOString().slice(0, 10);
    const { gte, lt } = dayBounds(day);

    // Find applicable rules for this day
    const applicable = rules.filter((r) => {
      if (r.type === "BLOCKED_DATE" || r.type === "CAPACITY_OVERRIDE") {
        return r.date && r.date >= gte && r.date < lt;
      }
      return (
        r.startDate && r.endDate && r.startDate <= lt && r.endDate >= gte
      );
    });

    const hasBlock = applicable.some(
      (r) => r.type === "BLOCKED_DATE" || r.type === "BLOCKED_RANGE"
    );

    let capacity: number | null = defaultThreshold;
    if (hasBlock) {
      capacity = null;
    } else {
      const overrides = applicable
        .filter((r) => r.capacity !== null)
        .map((r) => r.capacity as number);
      if (overrides.length > 0) capacity = Math.min(...overrides);
    }

    result[dayStr] = {
      count: countMap[dayStr] ?? 0,
      capacity,
      blocked: capacity === null,
    };
  }

  return result;
}
