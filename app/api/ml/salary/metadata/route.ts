export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { getCachedMlPayload, setCachedMlPayload } from "@/lib/ml/proxy-cache";
import {
  buildMlUpstreamHeaders,
  getMlServiceUrl,
  logMlProxyResult,
  proxyUpstreamError,
  runMlProxyGuards,
} from "@/lib/ml/proxy-utils";

const ROUTE = "/api/ml/salary/metadata";
const QUERY_CACHE_TTL_SECONDS = 15 * 60;
const BASE_CACHE_TTL_SECONDS = 6 * 60 * 60;
const DEGRADED_CACHE_TTL_SECONDS = 5 * 60;

function buildDegradedMetadataPayload() {
  return {
    skills: [],
    titles: [],
    company_scale_tiers: [],
    degraded: true,
  };
}

export async function GET(request: NextRequest) {
  const guard = runMlProxyGuards(request, "metadata", ROUTE);
  if (guard.response) {
    if (guard.response.status === 429) return guard.response;
    return NextResponse.json(buildDegradedMetadataPayload(), {
      headers: { "x-ml-degraded": "1" },
    });
  }
  const context = guard.context;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const limit = searchParams.get("limit") || "15";
    const normalizedQ = q.trim().toLowerCase();
    const cacheKey = `${ROUTE}?q=${normalizedQ}&limit=${limit}`;
    const cacheTtlSeconds = normalizedQ
      ? QUERY_CACHE_TTL_SECONDS
      : BASE_CACHE_TTL_SECONDS;

    const cached = getCachedMlPayload<unknown>(cacheKey);
    if (cached) {
      const response = NextResponse.json(cached);
      logMlProxyResult(context, ROUTE, "metadata", 200, false, "cache_hit");
      return response;
    }

    const url = new URL(`${getMlServiceUrl()}/api/v1/salary/metadata`);
    if (normalizedQ) url.searchParams.set("q", normalizedQ);
    if (limit) url.searchParams.set("limit", limit);

    const res = await fetch(url.toString(), {
      headers: buildMlUpstreamHeaders(request, context.clientIp),
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 429) {
        const response = await proxyUpstreamError(res);
        logMlProxyResult(
          context,
          ROUTE,
          "metadata",
          response.status,
          response.status === 429,
          "upstream_error",
        );
        return response;
      }

      const degradedPayload = buildDegradedMetadataPayload();
      setCachedMlPayload(cacheKey, degradedPayload, DEGRADED_CACHE_TTL_SECONDS);
      const response = NextResponse.json(degradedPayload, {
        headers: { "x-ml-degraded": "1" },
      });
      logMlProxyResult(
        context,
        ROUTE,
        "metadata",
        200,
        false,
        "degraded_upstream_error",
      );
      return response;
    }

    const data = await res.json();
    setCachedMlPayload(cacheKey, data, cacheTtlSeconds);

    const response = NextResponse.json(data);
    logMlProxyResult(context, ROUTE, "metadata", 200, false, "ok");
    return response;
  } catch (error) {
    console.error("ML salary metadata proxy error:", error);
    const degradedPayload = buildDegradedMetadataPayload();
    const response = NextResponse.json(degradedPayload, {
      headers: { "x-ml-degraded": "1" },
    });
    logMlProxyResult(context, ROUTE, "metadata", 200, false, "degraded_exception");
    return response;
  }
}
