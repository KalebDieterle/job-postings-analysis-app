export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAdminHealth } from "@/lib/admin-health";

export async function GET() {
  const result = await getAdminHealth();
  return NextResponse.json(result);
}
