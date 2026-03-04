export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const DEPRECATED_RESPONSE = {
  error: "deprecated",
  message:
    "This ML endpoint has been retired. Use /intelligence/salary-predictor.",
} as const;

export async function POST() {
  return NextResponse.json(DEPRECATED_RESPONSE, { status: 410 });
}
