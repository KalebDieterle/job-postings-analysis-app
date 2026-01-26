import { IndustryRadarChart } from "@/components/ui/charts/industry-radar-chart";
import { CompanyOverview } from "@/components/ui/company-overview";
import { CompanyAvgSalaryGraph } from "@/components/ui/charts/company-avg-salary-graph";
import { CompanyCard } from "@/components/ui/company-card";
import { FilterBar } from "@/components/ui/filters/filter-bar";

import { searchParamsCache } from "@/lib/search-params";
import {
  getAllCompanyData,
  getAverageCompanySalary,
  getTopCompaniesBySize,
  getAvgSalaryPerEmployeeForTop10Fortune,
} from "@/db/queries";

import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const CompaniesPage = async ({ searchParams }: PageProps) => {
  const filters = await searchParamsCache.parse(searchParams);

  const page = filters.page || 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  const [companiesRaw, salaryResults, sizeResults, fortuneResults] = await Promise.all([
    getAllCompanyData({
      limit,
      offset,
      search: filters.q,
      location: filters.location,
    }),
    getAverageCompanySalary(),
    getTopCompaniesBySize(),
    getAvgSalaryPerEmployeeForTop10Fortune(),
  ]);

  // Normalize data for the Client boundary
  const companies = companiesRaw.map((company) => ({
    ...company,
    postings_count: Number(company.postings_count ?? 0),
    company_size: company.company_size?.toString() || "N/A",
  }));

  const salaryData = salaryResults
    .slice(0, 10)
    .map((row) => ({
      company: row.company,
      avg_salary: Number(row.avg_salary ?? 0),
      posting_count: Number(row.posting_count ?? 0),
    }));

  // Note: sizeResults is kept here in case you need it for cards, 
  // but it's no longer passed to the chart below.
  const fortuneData = fortuneResults.map((row) => ({
    company: row.company,
    avg_salary: Number(row.avg_salary ?? 0), // FIXED: Pointing to row.avg_salary
    employee_count: Number(row.employee_count ?? 0),
    fortune_rank: Number(row.fortune_rank ?? 0),
    posting_count: Number(row.posting_count ?? 0),
  }));

  const globalAvg = Number(salaryResults[0]?.global_avg_salary ?? 0);

  const hasPrevPage = page > 1;
  const hasNextPage = companies.length === limit;

  const buildPageUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    params.set("page", pageNum.toString());
    if (filters.q) params.set("q", filters.q);
    if (filters.location) params.set("location", filters.location);
    return `?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Company Explorer</h1>
      <FilterBar />

      <Suspense fallback={<div className="h-32 bg-slate-900 animate-pulse rounded-xl" />}>
        <CompanyOverview />
      </Suspense>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="col-span-2 rounded-xl border bg-card p-4">
          <h3 className="text-sm font-medium mb-4 text-muted-foreground">
            Market Benchmark Analysis
          </h3>
          <CompanyAvgSalaryGraph
            data={salaryData}
            globalAvg={globalAvg}
            fortuneData={fortuneData}
          />
        </div>

        <div className="col-span-3 rounded-xl border bg-card p-4">
          <h3 className="text-sm font-medium mb-4 text-muted-foreground">
            Industry Hiring Distribution
          </h3>
          <IndustryRadarChart />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {offset + 1}–{offset + companies.length} companies
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {companies.map((company, index) => (
          <CompanyCard
            key={`${company.name}-${offset + index}`}
            name={company.name || "N/A"}
            size={company.company_size}
            country={company.country || "N/A"}
            rank={offset + index + 1}
            count={company.postings_count}
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 mt-8">
        {hasPrevPage && (
          <Link href={buildPageUrl(page - 1)} className="px-4 py-2 rounded-md border bg-card hover:bg-muted transition-colors flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" /> Previous
          </Link>
        )}
        <span className="px-4 py-2 text-sm text-muted-foreground">Page {page}</span>
        {hasNextPage && (
          <Link href={buildPageUrl(page + 1)} className="px-4 py-2 rounded-md border bg-card hover:bg-muted transition-colors flex items-center gap-2">
            Next <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
};

export default CompaniesPage;