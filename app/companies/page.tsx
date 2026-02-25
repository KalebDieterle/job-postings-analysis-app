export const dynamic = "force-dynamic";

import { IndustryRadarChart } from "@/components/ui/charts/industry-radar-chart";
import { CompanyOverview } from "@/components/ui/company-overview";
import { CompanyAvgSalaryGraph } from "@/components/ui/charts/company-avg-salary-graph";
import { CompanyCard } from "@/components/ui/company-card";
import { CompaniesFilterBar } from "@/components/ui/filters/companies-filter-bar";
import { HeroStatsDashboard } from "@/components/ui/companies/hero-stats-dashboard";
import { ComparisonPanelWrapper } from "@/components/ui/companies/comparison-panel-wrapper";

import { companiesSearchParamsCache } from "@/lib/companies-search-params";
import { slugify } from "@/lib/slugify";

import {
  getAllCompanyData,
  getAverageCompanySalary,
  getTopCompaniesBySize,
  getAvgSalaryPerEmployeeForTop10Fortune,
  getCompaniesHeroStats,
} from "@/db/queries";

import { Suspense } from "react";
import Link from "next/link";
import { PaginationControls } from "@/components/ui/skills/pagination-controls";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function CompaniesPage({ searchParams }: PageProps) {
  const filters = await companiesSearchParamsCache.parse(searchParams);
  const page =
    typeof filters.page === "string"
      ? parseInt(filters.page)
      : filters.page || 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  // Parallel data fetching - all queries run simultaneously
  const [companiesRaw, salaryResults, , fortuneResults, heroStats] =
    await Promise.all([
      getAllCompanyData({
        limit,
        offset,
        search: filters.q,
        location: filters.location,
        companySize: filters.companySize,
        minSalary: filters.minSalary,
        minPostings: filters.minPostings,
        sort: filters.sort,
      }),
      getAverageCompanySalary(),
      getTopCompaniesBySize(),
      getAvgSalaryPerEmployeeForTop10Fortune(),
      getCompaniesHeroStats(),
    ]);

  // Database query returns limit+1 rows to check for next page
  const hasNextPage = companiesRaw.length > limit;
  const hasPrevPage = page > 1;

  // Process companies (take only 'limit' items, not limit+1)
  // No filtering needed since query now filters at database level
  const companies = companiesRaw.slice(0, limit).map((company: any) => ({
    ...company,
    postings_count: Number(company.postings_count ?? 0),
    median_salary: Number(company.median_salary ?? company.avg_salary ?? 0),
    avg_salary: Number(company.median_salary ?? company.avg_salary ?? 0),
    company_size: company.company_size?.toString() || "N/A",
    slug: slugify(company.name ?? ""),
  }));

  const salaryData = salaryResults.slice(0, 10).map((row: any) => ({
    company: row.company,
    median_salary: Number(row.median_salary ?? row.avg_salary ?? 0),
    avg_salary: Number(row.median_salary ?? row.avg_salary ?? 0),
    posting_count: Number(row.posting_count ?? 0),
  }));

  const fortuneData = fortuneResults.map((row: any) => ({
    company: row.company,
    median_salary: Number(row.median_salary ?? row.avg_salary ?? 0),
    avg_salary: Number(row.median_salary ?? row.avg_salary ?? 0),
    employee_count: Number(row.employee_count ?? 0),
    fortune_rank: Number(row.fortune_rank ?? 0),
    posting_count: Number(row.posting_count ?? 0),
  }));

  const globalMedian = Number(
    salaryResults[0]?.global_median_salary ?? salaryResults[0]?.global_avg_salary ?? 0,
  );

  const buildPageUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    params.set("page", pageNum.toString());
    if (filters.q) params.set("q", filters.q);
    if (filters.location) params.set("location", filters.location);
    if (filters.companySize.length > 0)
      params.set("companySize", filters.companySize.join(","));
    if (filters.minSalary > 0)
      params.set("minSalary", filters.minSalary.toString());
    if (filters.minPostings > 0)
      params.set("minPostings", filters.minPostings.toString());
    if (filters.sort !== "postings") params.set("sort", filters.sort);
    return `/companies?${params.toString()}`;
  };

  return (
    <div className="container mx-auto p-6 space-y-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-4xl font-black tracking-tight lg:text-5xl">
            Company Explorer
          </h1>
        </div>
      </div>

      {/* Hero Stats Dashboard */}
      <HeroStatsDashboard stats={heroStats} />

      {/* Company Filters */}
      <CompaniesFilterBar />

      <Suspense
        fallback={<div className="h-28 rounded-xl bg-muted animate-pulse" />}
      >
        <CompanyOverview />
      </Suspense>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">Median Salary Benchmarks</h3>
              <p className="text-sm text-muted-foreground">
                Top companies by median salary
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                $
                {globalMedian.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                Global median
              </div>
            </div>
          </div>
          <CompanyAvgSalaryGraph
            data={salaryData}
            globalMedian={globalMedian}
            fortuneData={fortuneData}
          />
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">Market Concentration</h3>
              <p className="text-sm text-muted-foreground">
                Industry distribution across segments
              </p>
            </div>
            <div className="text-xs text-muted-foreground">Live</div>
          </div>
          <div className="h-64">
            <IndustryRadarChart />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Top Companies</h2>
      </div>

      <ComparisonPanelWrapper companies={companies} offset={offset} />

      {/* Pagination Controls */}
      {(hasNextPage || hasPrevPage) && (
        <div className="flex flex-col sm:flex-row items-center justify-between py-6 border-t border-slate-200 dark:border-slate-800 gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing{" "}
            <span className="font-bold text-slate-900 dark:text-white">
              {offset + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-slate-900 dark:text-white">
              {offset + companies.length}
            </span>{" "}
            of many companies
          </p>
          <PaginationControls
            currentPage={page}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            buildPageUrl={buildPageUrl}
          />
        </div>
      )}
    </div>
  );
}
