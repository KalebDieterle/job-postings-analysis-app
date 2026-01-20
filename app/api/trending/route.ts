import { NextResponse } from "next/server";
import { getTrendingSkills } from "@/db/queries";

export async function GET() {
  const trendingRaw = await getTrendingSkills();
  const trendingData = trendingRaw.map((row: any) => ({
    name: row.skill_name,
    value: Number(row.count),
  }));
  return NextResponse.json(trendingData);
}