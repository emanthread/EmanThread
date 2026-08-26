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

export function normalizePocketQuantity(value: string): "0" | "1" | "2" {
  return value === "2" ? "2" : value === "1" ? "1" : "0";
}
