import { NextRequest, NextResponse } from "next/server";

import { getCachedMlPayload, setCachedMlPayload } from "@/lib/ml/proxy-cache";
import {
  buildMlUpstreamHeaders,
  getMlServiceUrl,
  logMlProxyResult,
  proxyUpstreamError,
  runMlProxyGuards,
} from "@/lib/ml/proxy-utils";

const ROUTE = "/api/ml/clusters";
const CACHE_TTL_SECONDS = 6 * 60 * 60;
const CACHE_KEY = ROUTE;

export async function GET(request: NextRequest) {
  const guard = runMlProxyGuards(request, "lookup", ROUTE);
  if (guard.response) return guard.response;
  const context = guard.context;

  try {
    const cached = getCachedMlPayload<unknown>(CACHE_KEY);
    if (cached) {
      const response = NextResponse.json(cached);
      logMlProxyResult(context, ROUTE, "lookup", 200, false, "cache_hit");
      return response;
    }

    const res = await fetch(`${getMlServiceUrl()}/api/v1/clusters`, {
      headers: buildMlUpstreamHeaders(request, context.clientIp),
      cache: "no-store",
    });

    if (!res.ok) {
      const response = await proxyUpstreamError(res);
      logMlProxyResult(
        context,
        ROUTE,
        "lookup",
        response.status,
        response.status === 429,
        "upstream_error",
      );
      return response;
    }

    const data = await res.json();
    setCachedMlPayload(CACHE_KEY, data, CACHE_TTL_SECONDS);

    const response = NextResponse.json(data);
    logMlProxyResult(context, ROUTE, "lookup", 200, false, "ok");
    return response;
  } catch (error) {
    console.error("ML clusters proxy error:", error);
    const response = NextResponse.json(
      { error: "ml_unavailable", message: "ML service unavailable" },
      { status: 503 }
    );
    logMlProxyResult(context, ROUTE, "lookup", 503, true, "exception");
    return response;
  }
}
