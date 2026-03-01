import { NextRequest } from "next/server";

function firstForwardedIp(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const first = headerValue.split(",")[0]?.trim();
  return first || null;
}

export function getClientIp(request: NextRequest): string {
  const xForwardedFor = firstForwardedIp(request.headers.get("x-forwarded-for"));
  if (xForwardedFor) return xForwardedFor;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const flyClientIp = request.headers.get("fly-client-ip")?.trim();
  if (flyClientIp) return flyClientIp;

  return "unknown";
}

export function hashIdentifier(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

