import { NextRequest, NextResponse } from "next/server";
import { getCompanyComparisonData } from "@/db/queries";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object" || !("companyIds" in body)) {
      return NextResponse.json(
        { error: "Missing required field: companyIds" },
        { status: 400 },
      );
    }

    const rawCompanyIds = (body as { companyIds?: unknown }).companyIds;
    if (!Array.isArray(rawCompanyIds)) {
      return NextResponse.json(
        { error: "companyIds must be an array of company IDs" },
        { status: 400 },
      );
    }

    const companyIds = Array.from(
      new Set(
        rawCompanyIds
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    );

    if (companyIds.length === 0) {
      return NextResponse.json(
        { error: "At least one valid company ID is required" },
        { status: 400 },
      );
    }

    if (companyIds.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 companies can be compared" },
        { status: 400 },
      );
    }

    const data = await getCompanyComparisonData(companyIds);

    const payload = data.map((row) => ({
      ...row,
      median_salary: Number(row.median_salary ?? row.avg_salary ?? 0),
      avg_salary: Number(row.median_salary ?? row.avg_salary ?? 0),
    }));

    return NextResponse.json(payload);
  } catch (error) {
    console.error("API /companies/compare error:", error);
    return NextResponse.json(
      { error: "Failed to fetch comparison data" },
      { status: 500 },
    );
  }
}

