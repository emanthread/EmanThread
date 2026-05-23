export function normalizeWhatsAppNumber(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = "92" + digits.slice(1);
  }
  if (!digits.startsWith("92")) {
    digits = "92" + digits;
  }
  return digits;
}

export async function fetchWhatsAppNumber(): Promise<string> {
  try {
    const res = await fetch("/api/store/public");
    const data = await res.json();
    if (data.whatsappNumber) {
      return normalizeWhatsAppNumber(data.whatsappNumber);
    }
  } catch {
    // silently fail — caller should handle empty string
  }
  return "";
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}