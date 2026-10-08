export function normalizeWhatsAppNumber(raw: string): string {
  // A contact setting can list several numbers; never join them into one wa.me destination.
  const candidates = raw.split(/[,;|/\r\n]+|-\s*(?=\+|0[1-9])|\s+(?=\+)/);
  for (const candidate of candidates) {
    let digits = candidate.replace(/\D/g, "");
    if (!digits) continue;
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.startsWith("0")) digits = "92" + digits.slice(1);
    else if (digits.length === 10 && digits.startsWith("3")) digits = "92" + digits;
    if (digits.startsWith("92") ? /^92\d{10}$/.test(digits) : /^\+/.test(candidate.trim()) && /^[1-9]\d{6,14}$/.test(digits)) {
      return digits;
    }
  }
  return "";
}

export async function fetchWhatsAppNumber(): Promise<string> {
  try {
    const res = await fetch("/api/store/public", { cache: "no-store" });
    if (!res.ok) return "";
    const data = await res.json();
    if (typeof data.whatsappNumber === "string") {
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