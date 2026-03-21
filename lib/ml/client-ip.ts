import { NextRequest } from "next/server";
import { createHmac } from "crypto";

// Secret used to HMAC-hash IPs so they cannot be reversed from logs.
// Must be set via IP_HASH_SECRET environment variable in production.
if (!process.env.IP_HASH_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("IP_HASH_SECRET must be set in production");
}
const IP_HASH_SECRET = process.env.IP_HASH_SECRET ?? "dev-ip-hash-secret";

// Basic IPv4 / IPv6 sanity check — rejects obviously spoofed non-IP values.
const VALID_IP_RE = /^(?:\d{1,3}\.){3}\d{1,3}$|^[0-9a-f:]+$/i;

function isValidIp(value: string): boolean {
  return VALID_IP_RE.test(value);
}

/**
 * Extract the client IP from the request.
 *
 * Trust hierarchy (most → least trusted):
 *   1. fly-client-ip  – set by Fly.io edge, client cannot spoof it.
 *   2. x-real-ip      – set by Vercel/Nginx, reliable when behind a known proxy.
 *   3. rightmost non-private x-forwarded-for entry – conservative; the
 *      leftmost entry CAN be spoofed, so we take the last one added by a
 *      trusted proxy when there are multiple hops.
 */
export function getClientIp(request: NextRequest): string {
  // Fly.io strips any client-supplied fly-client-ip before setting its own.
  const flyClientIp = request.headers.get("fly-client-ip")?.trim();
  if (flyClientIp && isValidIp(flyClientIp)) return flyClientIp;

  // Vercel / Nginx set x-real-ip to the real client IP.
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && isValidIp(realIp)) return realIp;

  // Take the rightmost (most recently appended) entry from x-forwarded-for.
  // This is the IP the last trusted proxy saw, which is harder to spoof than
  // the leftmost entry that the client itself controls.
  const xffHeader = request.headers.get("x-forwarded-for");
  if (xffHeader) {
    const parts = xffHeader.split(",").map((s) => s.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      const candidate = parts[i];
      if (candidate && isValidIp(candidate)) return candidate;
    }
  }

  return "unknown";
}

/**
 * HMAC-SHA256 hash of the identifier using a server-side secret.
 * Prevents rainbow-table reversal of hashed IP addresses in logs.
 */
export function hashIdentifier(value: string): string {
  return createHmac("sha256", IP_HASH_SECRET).update(value).digest("hex").substring(0, 16);
}

