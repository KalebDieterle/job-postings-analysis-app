import { NextRequest, NextResponse } from "next/server";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const limit = searchParams.get("limit") || "15";

    const url = new URL(`${ML_SERVICE_URL}/api/v1/salary/metadata`);
    if (q) url.searchParams.set("q", q);
    if (limit) url.searchParams.set("limit", limit);

    const res = await fetch(url.toString());

    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json(
        { error: `ML service error: ${error}` },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("ML salary metadata proxy error:", error);
    return NextResponse.json({ error: "ML service unavailable" }, { status: 503 });
  }
}
