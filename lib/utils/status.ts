/**
 * Centralized status-to-className mapping for admin badges.
 *
 * Each status maps to Tailwind colour classes.
 * Case-insensitive lookup — match against the lowercase key.
 * Unknown statuses fall back to gray.
 */

const STATUS_BADGE_MAP: Record<string, string> = {
  // Tailor / measurement statuses
  pending:     "bg-amber-100 text-amber-700 border-amber-200",
  accepted:    "bg-sky-100 text-sky-700 border-sky-200",
  approved:    "bg-sky-100 text-sky-700 border-sky-200",
  rejected:    "bg-red-100 text-red-700 border-red-200",
  complete:    "bg-emerald-100 text-emerald-700 border-emerald-200",

  // Payment verification statuses
  VERIFIED:    "bg-emerald-100 text-emerald-700",
  REJECTED:    "bg-red-100 text-red-700",
  PENDING:     "bg-amber-100 text-amber-700",

  // Customer statuses
  active:      "bg-green-100 text-green-700",
  inactive:    "bg-gray-100 text-gray-800",

  // Order statuses
  processing:  "bg-blue-100 text-blue-800",
  shipped:     "bg-purple-100 text-purple-800",
  delivered:   "bg-green-100 text-green-700",
  cancelled:   "bg-red-100 text-red-700",
};

export function getStatusBadgeClass(status: string): string {
  const lower = status.toLowerCase();
  if (STATUS_BADGE_MAP[lower]) return STATUS_BADGE_MAP[lower];
  return STATUS_BADGE_MAP[status] ?? "bg-gray-100 text-gray-800";
}
