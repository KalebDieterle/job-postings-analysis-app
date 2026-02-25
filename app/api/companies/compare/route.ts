import { NextRequest, NextResponse } from "next/server";
import { getCompanyComparisonData } from "@/db/queries";

export async function POST(request: NextRequest) {
  try {
    const { companyIds } = await request.json();
    
    console.log('🔍 API /companies/compare - Request received:', { companyIds, count: companyIds?.length });
    
    if (!Array.isArray(companyIds) || companyIds.length === 0) {
      console.warn('⚠️ API /companies/compare - Invalid company IDs');
      return NextResponse.json(
        { error: "Invalid company IDs provided" },
        { status: 400 }
      );
    }

    if (companyIds.length > 5) {
      console.warn('⚠️ API /companies/compare - Too many company IDs:', companyIds.length);
      return NextResponse.json(
        { error: "Maximum 5 companies can be compared" },
        { status: 400 }
      );
    }

    const data = await getCompanyComparisonData(companyIds);
    console.log('✅ API /companies/compare - Data fetched successfully:', {
      count: data.length,
      sample: data[0] ? {
        name: data[0].name,
        median_salary: data[0].median_salary ?? data[0].avg_salary,
        posting_count: data[0].posting_count
      } : 'no data'
    });

    const payload = data.map((row: any) => ({
      ...row,
      median_salary: Number(row.median_salary ?? row.avg_salary ?? 0),
      avg_salary: Number(row.median_salary ?? row.avg_salary ?? 0),
    }));

    return NextResponse.json(payload);
  } catch (error) {
    console.error("❌ API /companies/compare - Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch comparison data" },
      { status: 500 }
    );
  }
}
