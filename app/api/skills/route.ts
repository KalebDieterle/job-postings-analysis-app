import { NextRequest, NextResponse } from "next/server";
import { getAllSkillsPaginated } from "@/db/queries";
import {
  parseBoundedIntParam,
  parseStringParam,
} from "@/lib/api-validation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const searchResult = parseStringParam(searchParams, "search", 120);
  if ("error" in searchResult) {
    return NextResponse.json({ error: searchResult.error }, { status: 400 });
  }

  const pageResult = parseBoundedIntParam(searchParams, "page", {
    defaultValue: 1,
    min: 1,
    max: 10_000,
  });
  if ("error" in pageResult) {
    return NextResponse.json({ error: pageResult.error }, { status: 400 });
  }

  const limitResult = parseBoundedIntParam(searchParams, "limit", {
    defaultValue: 12,
    min: 1,
    max: 100,
  });
  if ("error" in limitResult) {
    return NextResponse.json({ error: limitResult.error }, { status: 400 });
  }

  const result = await getAllSkillsPaginated({
    search: searchResult.value,
    page: pageResult.value,
    limit: limitResult.value,
  });

  const items = result.items.map((row) => ({
    name: row.name,
    count: Number(row.count),
    medianSalary: Number(row.median_salary ?? row.avg_salary ?? 0),
    avgSalary: Number(row.median_salary ?? row.avg_salary ?? 0),
  }));

  return NextResponse.json({
    items,
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
    hasNext: result.hasNext,
  });
}
