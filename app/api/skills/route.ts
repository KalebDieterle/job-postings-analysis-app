import { NextRequest, NextResponse } from "next/server"; // Use NextRequest for URL parsing
import { getAllSkills } from "@/db/queries";

export async function GET(request: NextRequest) {
    // 1. Extract searchParams from the URL
    const { searchParams } = new URL(request.url);
    
    // 2. Parse values (providing defaults to match your query logic)
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");

    // 3. Pass the required object to getAllSkills
    const trendingRaw = await getAllSkills({
        search,
        page,
        limit
    });

    const trendingData = trendingRaw.map((row: any) => ({
        name: row.name, // Matches the key name defined in our Step 1 query
        count: Number(row.count),
        avgSalary: Number(row.avgSalary),
    }));

    return NextResponse.json(trendingData);
}