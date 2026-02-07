import { NextRequest, NextResponse } from "next/server";
import { getCompanyComparisonData } from "@/db/queries";

export async function POST(request: NextRequest) {
  try {
    const { companyIds } = await request.json();
    
    if (!Array.isArray(companyIds) || companyIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid company IDs provided" },
        { status: 400 }
      );
    }

    if (companyIds.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 companies can be compared" },
        { status: 400 }
      );
    }

    const data = await getCompanyComparisonData(companyIds);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching comparison data:", error);
    return NextResponse.json(
      { error: "Failed to fetch comparison data" },
      { status: 500 }
    );
  }
}
