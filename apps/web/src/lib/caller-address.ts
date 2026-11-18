// The caller's address, for rate limits. Server only.
//
// Behind a reverse proxy the real visitor address is in X-Forwarded-For.
// A proxy appends the address it saw, so anything to its left may have
// been written by the visitor and cannot be trusted. LPG_TRUSTED_PROXY_HOPS
// says how many proxies sit in front of the app (default 1): the address
// that many places from the right end is the one the nearest trusted
// proxy saw. With no header at all, the address is "unknown".

export function addressFromForwardedFor(header: string | null | undefined, trustedHops: number): string {
  const parts = (header ?? "").split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return "unknown";
  const hops = Number.isInteger(trustedHops) && trustedHops > 0 ? trustedHops : 1;
  const index = Math.max(0, parts.length - hops);
  return parts[index] ?? "unknown";
}

export function trustedProxyHops(): number {
  const raw = Number(process.env.LPG_TRUSTED_PROXY_HOPS ?? "1");
  return Number.isInteger(raw) && raw > 0 ? raw : 1;
}
