export const MEASUREMENT_FRACTIONS = [
  "1/8",
  "1/4",
  "3/8",
  "1/2",
  "5/8",
  "3/4",
  "7/8",
] as const;

export type MeasurementFraction = (typeof MEASUREMENT_FRACTIONS)[number] | "";

export function splitMeasurementValue(value: string): {
  whole: string;
  fraction: MeasurementFraction;
} {
  const trimmed = value.trim();
  if (!trimmed) return { whole: "", fraction: "" };

  for (const fraction of [...MEASUREMENT_FRACTIONS].sort(
    (left, right) => right.length - left.length
  )) {
    if (trimmed === fraction) return { whole: "", fraction };
    if (trimmed.endsWith(` ${fraction}`)) {
      return {
        whole: trimmed.slice(0, -fraction.length).trim(),
        fraction,
      };
    }
  }

  return { whole: value, fraction: "" };
}

export function composeMeasurementValue(
  whole: string,
  fraction: MeasurementFraction
): string {
  return [whole.trim(), fraction].filter(Boolean).join(" ");
}

export const MAX_POCKET_QUANTITY = 99;

/**
 * Keep legacy checkbox values readable while allowing real pocket counts.
 * Invalid historical values safely display as zero.
 */
export function normalizePocketQuantity(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return "1";
  if (normalized === "false" || normalized === "") return "0";
  if (!/^\d+$/.test(normalized)) return "0";

  return String(
    Math.min(Number.parseInt(normalized, 10), MAX_POCKET_QUANTITY)
  );
}

export function sanitizePocketQuantityInput(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d{0,2}$/.test(trimmed)) return null;
  if (!trimmed) return "";

  return String(
    Math.min(Number.parseInt(trimmed, 10), MAX_POCKET_QUANTITY)
  );
}
