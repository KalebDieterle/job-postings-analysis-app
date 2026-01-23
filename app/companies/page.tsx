import { IndustryRadarChart } from "@/components/ui/charts/industry-radar-chart";
import { CompanyOverview } from "@/components/ui/company-overview";
import { CompanyCard } from "@/components/ui/company-card";
import { FilterBar } from "@/components/ui/filters/filter-bar";
import { searchParamsCache } from "@/lib/search-params";
import { getAllCompanyData } from "@/db/queries";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const CompaniesPage = async ({ searchParams }: PageProps) => {
  const filters = await searchParamsCache.parse(searchParams);
  const page = filters.page || 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  const companies = await getAllCompanyData({
    limit,
    offset,
    search: filters.q,
    location: filters.location,
  });

  const hasPrevPage = page > 1;
  const hasNextPage = companies.length === limit; // If we got a full page, there might be more

  const buildPageUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    params.set("page", pageNum.toString());
    if (filters.q) params.set("q", filters.q);
    if (filters.location) params.set("location", filters.location);
    return `?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-4">Company Explorer</h1>

      <FilterBar />

      <Suspense>
        <CompanyOverview />
      </Suspense>

      <Suspense>
        <IndustryRadarChart />
      </Suspense>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {offset + 1}–{offset + companies.length} companies
          {filters.q && ` matching "${filters.q}"`}
          {filters.location && ` in ${filters.location}`}
        </p>
      </div>

      {companies.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {companies.map((company, index) => {
            const count = company.postings_count ?? 0;

            return (
              <CompanyCard
                key={`${company.name}-${offset + index}`}
                name={company.name || "N/A"}
                size={company.company_size?.toString() || "N/A"} // Convert to string
                country={company.country || "N/A"}
                rank={offset + index + 1}
                count={count}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed rounded-xl">
          <h3 className="text-lg font-medium">No companies found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filters.
          </p>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2 mt-8">
        {hasPrevPage && (
          <Link
            href={buildPageUrl(page - 1)}
            className="flex items-center gap-1 px-4 py-2 rounded-md border bg-card hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Link>
        )}

        <span className="px-4 py-2 text-sm text-muted-foreground">
          Page {page}
        </span>

        {hasNextPage && (
          <Link
            href={buildPageUrl(page + 1)}
            className="flex items-center gap-1 px-4 py-2 rounded-md border bg-card hover:bg-muted transition-colors"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
};

export default CompaniesPage;
