import { IndustryRadarChart } from "@/components/ui/charts/industry-radar-chart";
import { CompanyOverview } from "@/components/ui/company-overview";
import { FilterBar } from "@/components/ui/filters/filter-bar";
import { searchParamsCache } from "@/lib/search-params";
import { Filter } from "lucide-react";
import React from "react";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const CompaniesPage = async ({ searchParams }: PageProps) => {
  console.log("🚀 [RolesPage] Starting page render");
  const pageStart = Date.now();
  console.log("📝 [RolesPage] Parsing search params...");
  const filters = await searchParamsCache.parse(searchParams);
  console.log("✅ [RolesPage] Filters:", filters);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-4">Company Explorer</h1>
      <FilterBar />
      <CompanyOverview />
      <IndustryRadarChart />
    </div>
  );
};

export default CompaniesPage;
