const IPV4_PARTS = 4;

function normalizeIp(value: string): string {
  const trimmed = value.trim();
  const bracketed = trimmed.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) return bracketed[1];

  const ipv4WithPort = trimmed.match(/^((?:\d{1,3}\.){3}\d{1,3}):\d+$/);
  if (ipv4WithPort) return ipv4WithPort[1];

  return trimmed.startsWith("::ffff:") ? trimmed.slice(7) : trimmed;
}

function isValidIpv4(value: string): boolean {
  const parts = value.split(".");
  return (
    parts.length === IPV4_PARTS &&
    parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
  );
}

function isValidIpv6(value: string): boolean {
  return value.includes(":") && /^[0-9a-fA-F:.]+$/.test(value);
}

function validIp(value: string | null): string | null {
  if (!value) return null;
  const normalized = normalizeIp(value);
  return isValidIpv4(normalized) || isValidIpv6(normalized)
    ? normalized
    : null;
}

/** Uses headers set by the trusted hosting proxy, then falls back to XFF. */
export function getClientIp(request: Request): string {
  for (const header of ["cf-connecting-ip", "x-real-ip"]) {
    const parsed = validIp(request.headers.get(header));
    if (parsed) return parsed;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    for (const entry of forwarded.split(",")) {
      const parsed = validIp(entry);
      if (parsed) return parsed;
    }
  }

  return "unknown";
}
