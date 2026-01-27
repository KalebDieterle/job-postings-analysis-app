import { IndustryRadarChart } from "@/components/ui/charts/industry-radar-chart";
import { CompanyOverview } from "@/components/ui/company-overview";
import { CompanyAvgSalaryGraph } from "@/components/ui/charts/company-avg-salary-graph";
import { CompanyCard } from "@/components/ui/company-card";
import { FilterBar } from "@/components/ui/filters/filter-bar";

import { searchParamsCache } from "@/lib/search-params";
import { slugify } from "@/lib/slugify";

import {
  getAllCompanyData,
  getAverageCompanySalary,
  getTopCompaniesBySize,
  getAvgSalaryPerEmployeeForTop10Fortune,
} from "@/db/queries";

import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

console.log("IndustryRadarChart:", IndustryRadarChart);
console.log("CompanyAvgSalaryGraph:", CompanyAvgSalaryGraph);
console.log("CompanyOverview:", CompanyOverview);
console.log("CompanyCard:", CompanyCard);
console.log("FilterBar:", FilterBar);

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CompaniesPage({ searchParams }: PageProps) {
  const filters = await searchParamsCache.parse(searchParams);

  const page = filters.page || 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  const [companiesRaw, salaryResults, , fortuneResults] = await Promise.all([
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

  const companies = companiesRaw
    .filter((company: any) => {
      const name = company.name?.toLowerCase() || "";
      return !(
        name === "confidential" ||
        name === "confidential company" ||
        name.startsWith("confidential (") ||
        name.includes("eox vantage")
      );
    })
    .map((company: any) => ({
      ...company,
      postings_count: Number(company.postings_count ?? 0),
      company_size: company.company_size?.toString() || "N/A",
      slug: slugify(company.name ?? ""),
    }));

  const salaryData = salaryResults.slice(0, 10).map((row: any) => ({
    company: row.company,
    avg_salary: Number(row.avg_salary ?? 0),
    posting_count: Number(row.posting_count ?? 0),
  }));

  const fortuneData = fortuneResults.map((row: any) => ({
    company: row.company,
    avg_salary: Number(row.avg_salary ?? 0),
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

      <Suspense
        fallback={
          <div className="h-32 bg-slate-900 animate-pulse rounded-xl" />
        }
      >
        <CompanyOverview />
      </Suspense>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="col-span-2 rounded-xl border bg-card p-4">
          <CompanyAvgSalaryGraph
            data={salaryData}
            globalAvg={globalAvg}
            fortuneData={fortuneData}
          />
        </div>

        <div className="col-span-3 rounded-xl border bg-card p-4">
          <IndustryRadarChart />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {offset + 1}–{offset + companies.length} companies
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {companies.map((company: any, index: number) => (
          <Link
            key={`${company.name}-${offset + index}`}
            href={`/companies/${company.slug}`}
          >
            <CompanyCard
              name={company.name || "N/A"}
              size={company.company_size}
              country={company.country || "N/A"}
              rank={offset + index + 1}
              count={company.postings_count}
            />
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 mt-8">
        {hasPrevPage && (
          <Link
            href={buildPageUrl(page - 1)}
            className="px-4 py-2 rounded-md border"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Link>
        )}
        <span className="px-4 py-2 text-sm text-muted-foreground">
          Page {page}
        </span>
        {hasNextPage && (
          <Link
            href={buildPageUrl(page + 1)}
            className="px-4 py-2 rounded-md border"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
