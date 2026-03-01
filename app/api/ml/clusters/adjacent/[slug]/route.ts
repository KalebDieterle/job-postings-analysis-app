import { NextRequest, NextResponse } from "next/server";

import {
  buildMlUpstreamHeaders,
  getMlServiceUrl,
  logMlProxyResult,
  proxyUpstreamError,
  runMlProxyGuards,
} from "@/lib/ml/proxy-utils";

const ROUTE = "/api/ml/clusters/adjacent/[slug]";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const guard = runMlProxyGuards(request, "lookup", ROUTE);
  if (guard.response) return guard.response;
  const context = guard.context;

  try {
    const { slug } = await params;
    const res = await fetch(
      `${getMlServiceUrl()}/api/v1/clusters/adjacent/${encodeURIComponent(slug)}`,
      {
        headers: buildMlUpstreamHeaders(request, context.clientIp),
        cache: "no-store",
      },
    );

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
    const response = NextResponse.json(data);
    logMlProxyResult(context, ROUTE, "lookup", 200, false, "ok");
    return response;
  } catch (error) {
    console.error("ML adjacent roles proxy error:", error);
    const response = NextResponse.json(
      { error: "ml_unavailable", message: "ML service unavailable" },
      { status: 503 }
    );
    logMlProxyResult(context, ROUTE, "lookup", 503, true, "exception");
    return response;
  }
}
