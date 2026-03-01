import { NextRequest, NextResponse } from "next/server";

import { getClientIp, hashIdentifier } from "@/lib/ml/client-ip";
import { checkMlRateLimit, MlEndpointClass } from "@/lib/ml/rate-limit";

const ML_PROXY_ENABLED = process.env.ML_PROXY_ENABLED !== "false";
const ML_RATE_LIMIT_ENABLED = process.env.ML_RATE_LIMIT_ENABLED !== "false";
const ML_SERVICE_URL = (process.env.ML_SERVICE_URL || "http://localhost:8000").replace(/\/+$/, "");
const ML_SERVICE_KEY = process.env.ML_SERVICE_KEY || "";

interface MlProxyLogEvent {
  route: string;
  endpointClass: MlEndpointClass;
  ipHash: string;
  status: number;
  blocked: boolean;
  reason: string;
  latencyMs: number;
}

export interface MlProxyContext {
  startedAt: number;
  clientIp: string;
  clientIpHash: string;
}

export function createRateLimitedResponse(
  retryAfterSeconds: number,
  limit: number,
  remaining: number,
  resetAtSeconds: number,
): NextResponse {
  return NextResponse.json(
    {
      error: "rate_limited",
      message: "Too many requests",
      retry_after_seconds: retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(resetAtSeconds),
      },
    },
  );
}

export function createUnavailableResponse(message: string): NextResponse {
  return NextResponse.json(
    {
      error: "ml_unavailable",
      message,
    },
    { status: 503 },
  );
}

function logMlProxyEvent(event: MlProxyLogEvent): void {
  console.info(
    JSON.stringify({
      component: "ml_proxy",
      route: event.route,
      endpoint_class: event.endpointClass,
      ip_hash: event.ipHash,
      status: event.status,
      blocked: event.blocked,
      reason: event.reason,
      latency_ms: event.latencyMs,
      ts: new Date().toISOString(),
    }),
  );
}

export function logMlProxyResult(
  context: MlProxyContext,
  route: string,
  endpointClass: MlEndpointClass,
  status: number,
  blocked: boolean,
  reason: string,
): void {
  logMlProxyEvent({
    route,
    endpointClass,
    ipHash: context.clientIpHash,
    status,
    blocked,
    reason,
    latencyMs: Date.now() - context.startedAt,
  });
}

export function runMlProxyGuards(
  request: NextRequest,
  endpointClass: MlEndpointClass,
  route: string,
): { context: MlProxyContext; response: null } | { context: null; response: NextResponse } {
  const clientIp = getClientIp(request);
  const context: MlProxyContext = {
    startedAt: Date.now(),
    clientIp,
    clientIpHash: hashIdentifier(clientIp),
  };

  if (!ML_PROXY_ENABLED) {
    const response = createUnavailableResponse("ML proxy is disabled");
    logMlProxyResult(context, route, endpointClass, 503, true, "proxy_disabled");
    return { context: null, response };
  }

  if (!ML_SERVICE_KEY) {
    const response = createUnavailableResponse("ML proxy is misconfigured");
    logMlProxyResult(context, route, endpointClass, 503, true, "missing_ml_service_key");
    return { context: null, response };
  }

  if (ML_RATE_LIMIT_ENABLED) {
    const rateLimit = checkMlRateLimit(context.clientIp, endpointClass);
    if (!rateLimit.allowed) {
      const response = createRateLimitedResponse(
        rateLimit.retryAfterSeconds,
        rateLimit.limit,
        rateLimit.remaining,
        rateLimit.resetAtSeconds,
      );
      logMlProxyResult(
        context,
        route,
        endpointClass,
        429,
        true,
        `rate_limited_${rateLimit.scope}`,
      );
      return { context: null, response };
    }
  }

  return { context, response: null };
}

export function buildMlUpstreamHeaders(
  request: NextRequest,
  clientIp: string,
  contentType?: string,
): HeadersInit {
  return {
    "x-ml-service-key": ML_SERVICE_KEY,
    "x-forwarded-for": clientIp,
    ...(contentType ? { "Content-Type": contentType } : {}),
    ...(request.headers.get("x-request-id")
      ? { "x-request-id": request.headers.get("x-request-id") as string }
      : {}),
  };
}

function pickRateLimitHeaders(headers: Headers): HeadersInit {
  const selected = new Headers();
  const mappings: Array<{ source: string; target: string }> = [
    { source: "retry-after", target: "Retry-After" },
    { source: "x-ratelimit-limit", target: "X-RateLimit-Limit" },
    { source: "x-ratelimit-remaining", target: "X-RateLimit-Remaining" },
    { source: "x-ratelimit-reset", target: "X-RateLimit-Reset" },
  ];

  for (const mapping of mappings) {
    const value = headers.get(mapping.source);
    if (value) {
      selected.set(mapping.target, value);
    }
  }

  return selected;
}

export async function proxyUpstreamError(res: Response): Promise<NextResponse> {
  const contentType = res.headers.get("content-type") || "";
  const headers = pickRateLimitHeaders(res.headers);

  let payload: unknown;
  if (contentType.includes("application/json")) {
    payload = await res.json();
  } else {
    const text = await res.text();
    payload = {
      error: "ml_service_error",
      message: text || "ML service request failed",
    };
  }

  return NextResponse.json(payload, { status: res.status, headers });
}

export function getMlServiceUrl(): string {
  return ML_SERVICE_URL;
}
