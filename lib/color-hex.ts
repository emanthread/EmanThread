export const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value.trim());
}

/**
 * Keep in-progress editor input usable while canonicalizing valid hex digits.
 * A leading # is added for admins who type or paste values such as 0088CC.
 * Invalid characters are preserved so the field can display a validation
 * error instead of silently discarding what the admin entered.
 */
export function normalizeHexColorInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^[0-9a-f]{1,6}$/i.test(trimmed)) {
    return `#${trimmed.toUpperCase()}`;
  }
  if (/^#[0-9a-f]{0,6}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return trimmed;
}

export function colorPickerValue(value: string): string {
  return isValidHexColor(value) ? value.trim() : "#000000";
}
