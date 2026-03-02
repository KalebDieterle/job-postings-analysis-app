import { NextRequest, NextResponse } from "next/server";
import { getTrendingSkills } from "@/db/queries";
import { parseBoundedIntParam, parseEnumParam } from "@/lib/api-validation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const timeframeResult = parseEnumParam(
    searchParams,
    "timeframe",
    ["7", "30", "90"] as const,
    "7",
  );
  if ("error" in timeframeResult) {
    return NextResponse.json({ error: timeframeResult.error }, { status: 400 });
  }

  const sortByResult = parseEnumParam(
    searchParams,
    "sortBy",
    ["demand", "salary"] as const,
    "demand",
  );
  if ("error" in sortByResult) {
    return NextResponse.json({ error: sortByResult.error }, { status: 400 });
  }

  const limitResult = parseBoundedIntParam(searchParams, "limit", {
    defaultValue: 24,
    min: 1,
    max: 100,
  });
  if ("error" in limitResult) {
    return NextResponse.json({ error: limitResult.error }, { status: 400 });
  }

  const trendingRaw = await getTrendingSkills(
    Number.parseInt(timeframeResult.value, 10),
    limitResult.value,
    sortByResult.value,
  );

  const trendingData = trendingRaw.map((row) => ({
    name: row.name,
    value: Number(row.current_count),
  }));

  return NextResponse.json(trendingData);
}
