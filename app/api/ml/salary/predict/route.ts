import { NextRequest, NextResponse } from "next/server";

import {
  buildMlUpstreamHeaders,
  getMlServiceUrl,
  logMlProxyResult,
  proxyUpstreamError,
  runMlProxyGuards,
} from "@/lib/ml/proxy-utils";

const ROUTE = "/api/ml/salary/predict";

export async function POST(request: NextRequest) {
  const guard = runMlProxyGuards(request, "predict", ROUTE);
  if (guard.response) return guard.response;
  const context = guard.context;

  try {
    const body = await request.json();

    const res = await fetch(`${getMlServiceUrl()}/api/v1/salary/predict`, {
      method: "POST",
      headers: buildMlUpstreamHeaders(
        request,
        context.clientIp,
        "application/json",
      ),
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!res.ok) {
      const response = await proxyUpstreamError(res);
      logMlProxyResult(
        context,
        ROUTE,
        "predict",
        response.status,
        response.status === 429,
        "upstream_error",
      );
      return response;
    }

    const data = await res.json();
    const response = NextResponse.json(data);
    logMlProxyResult(context, ROUTE, "predict", 200, false, "ok");
    return response;
  } catch (error) {
    console.error("ML salary predict proxy error:", error);
    const response = NextResponse.json(
      { error: "ml_unavailable", message: "ML service unavailable" },
      { status: 503 }
    );
    logMlProxyResult(context, ROUTE, "predict", 503, true, "exception");
    return response;
  }
}
