import { NextResponse } from "next/server";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export async function GET() {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/api/v1/clusters`);

    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json(
        { error: `ML service error: ${error}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("ML clusters proxy error:", error);
    return NextResponse.json(
      { error: "ML service unavailable" },
      { status: 503 }
    );
  }
}
