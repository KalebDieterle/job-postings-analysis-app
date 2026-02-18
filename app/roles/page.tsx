export const dynamic = "force-dynamic";

import React, { Suspense } from "react";
import {
  getTopJobRoles,
  getTopRolesTimeSeries,
  getAverageSalary,
  getTopLocation,
  getRemotePercentage,
  getRoleDistribution,
  getSkillsFrequency,
  getPostingTimeline,
  getExperienceDistribution,
  getSalaryInsights,
  getRolesSalaryBenchmark,
} from "@/db/queries";
import RoleCard from "@/components/ui/role-card";
import { PaginationControls } from "@/components/ui/skills/pagination-controls";
import { StatsGrid } from "@/components/ui/roles/stats-grid";
import { RoleDistributionChart } from "@/components/ui/roles/role-distribution-chart";
import { SalaryByRoleChart } from "@/components/ui/roles/salary-by-role-chart";
import { MarketInsightsBar } from "@/components/ui/roles/market-insights-bar";
import { SkillsFrequencyChart } from "@/components/ui/roles/skills-frequency-chart";
import { PostingTimelineChart } from "@/components/ui/roles/posting-timeline-chart";
import { ExperienceBreakdownChart } from "@/components/ui/roles/experience-breakdown-chart";
import { slugify } from "@/lib/slugify";
import { searchParamsCache } from "@/lib/search-params";
import { FilterBar } from "@/components/ui/filters/filter-bar";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function RolesPage({ searchParams }: PageProps) {
  try {
    const filters = await searchParamsCache.parse(searchParams);

    const roles = await getTopJobRoles(20, filters, Number(filters.page ?? 1));

    const [
      avgSalary,
      topLocation,
      remotePercentage,
      roleDistribution,
      skillsFrequency,
      postingTimeline,
      experienceDistribution,
      salaryInsights,
      salaryBenchmark,
    ] = await Promise.all([
      getAverageSalary(filters),
      getTopLocation(filters),
      getRemotePercentage(filters),
      getRoleDistribution(10, filters),
      getSkillsFrequency(20, filters),
      getPostingTimeline(90, filters),
      getExperienceDistribution(filters),
      getSalaryInsights(),
      getRolesSalaryBenchmark(8),
    ]);

    const tsRows = await getTopRolesTimeSeries(roles.length || 20);

    const timeseriesMap = new Map<string, { day: string; count: number }[]>();
    for (const row of tsRows) {
      const list = timeseriesMap.get(row.title) ?? [];
      list.push({ day: row.day, count: row.count });
      timeseriesMap.set(row.title, list);
    }

    // Salary lookup map for role cards
    const salaryMap = new Map(salaryBenchmark.map((r) => [r.title, r.avg_salary]));

    const totalRoles = roleDistribution.reduce((sum, r) => sum + r.count, 0);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="pb-2">
          <h1 className="text-3xl font-bold mb-1">Explore Roles</h1>
          <p className="text-muted-foreground text-sm">
            {totalRoles.toLocaleString()} postings across all roles
          </p>
        </div>

        {/* Stats Grid */}
        <StatsGrid
          totalRoles={totalRoles}
          avgSalary={avgSalary}
          topLocation={{
            location: topLocation?.location ?? "N/A",
            count: topLocation?.count ?? 0,
          }}
          remotePercentage={remotePercentage}
        />

        {/* Market Pulse — synthesized insights */}
        <MarketInsightsBar
          highestPayingRole={salaryInsights.highestRole}
          highestSalary={salaryInsights.highestSalary}
          mostInDemandRole={roleDistribution[0]?.title ?? "N/A"}
          mostInDemandCount={roleDistribution[0]?.count ?? 0}
          medianSalary={salaryInsights.medianSalary}
          minSalary={salaryInsights.minSalary}
          maxSalary={salaryInsights.maxSalary}
        />

        {/* Salary Benchmark + Role Distribution side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalaryByRoleChart data={salaryBenchmark} />
          <RoleDistributionChart data={roleDistribution} />
        </div>

        {/* Filter Bar */}
        <FilterBar />

        {/* Role Cards Grid */}
        <h2 className="text-2xl font-bold">Browse All Roles</h2>
        {roles.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((r: any) => (
              <RoleCard
                key={r.title}
                title={r.title}
                count={Number(r.count)}
                timeseries={timeseriesMap.get(r.title) ?? []}
                avgSalary={salaryMap.get(r.title)}
                href={
                  slugify(r.title) ? `/roles/${slugify(r.title)}` : undefined
                }
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center border-2 border-dashed rounded-xl bg-muted/10">
            <p className="text-muted-foreground">
              No roles found matching your filters.
            </p>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex items-center justify-between py-6 border-t border-slate-200 dark:border-slate-800">
          <div className="text-sm text-slate-500">Page {filters.page ?? 1}</div>
          <PaginationControls
            currentPage={Number(filters.page ?? 1)}
            hasNextPage={roles.length === 20}
            hasPrevPage={Number(filters.page ?? 1) > 1}
            buildPageUrl={(pageNum: number) => {
              const params = new URLSearchParams();
              if (filters.q) params.set("q", String(filters.q));
              if (filters.location)
                params.set("location", String(filters.location));
              if (filters.minSalary)
                params.set("minSalary", String(filters.minSalary));
              if (filters.experience && Array.isArray(filters.experience)) {
                for (const e of filters.experience)
                  params.append("experience", String(e));
              }
              params.set("page", String(pageNum));
              return `/roles?${params.toString()}`;
            }}
          />
        </div>

        {/* Deep Analytics — filter-aware */}
        <div className="mt-4 space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Detailed Analytics</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Reflects your current filters
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PostingTimelineChart data={postingTimeline} />
            <ExperienceBreakdownChart data={experienceDistribution} />
          </div>
          <SkillsFrequencyChart data={skillsFrequency} />
        </div>
      </div>
    );
  } catch (error) {
    console.error("❌ [RolesPage] Error:", error);
    throw error;
  }
}
