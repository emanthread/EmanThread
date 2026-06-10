/**
 * Timezone utilities for Eman Thread.
 *
 * All server timestamps are stored as UTC in the database.
 * These helpers convert UTC dates to Pakistan Standard Time (PKT, UTC+5)
 * for display to users in Pakistan.
 */

/**
 * Convert a UTC date to Pakistan Standard Time (PKT = UTC+5).
 * Returns a new Date object offset by +5 hours.
 */
export function toPKT(utcDate: Date | string): Date {
  const d = new Date(utcDate);
  return new Date(d.getTime() + 5 * 60 * 60 * 1000);
}

/**
 * Format a UTC date string/Date for display in Pakistan Standard Time.
 * Uses Intl.DateTimeFormat with Asia/Karachi timezone for correct display.
 */
export function formatPKT(
  utcDate: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Karachi',
    ...options,
  };
  return new Intl.DateTimeFormat('en-PK', defaultOptions).format(new Date(utcDate));
}

/**
 * Format a UTC date to a PKT date-only string (e.g., "Jun 10, 2026").
 */
export function formatPKTDate(utcDate: Date | string): string {
  return formatPKT(utcDate, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Karachi',
  });
}
