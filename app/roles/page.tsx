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
} from "@/db/queries";
import RoleCard from "@/components/ui/role-card";
import { PaginationControls } from "@/components/ui/skills/pagination-controls";
import { StatsGrid } from "@/components/ui/roles/stats-grid";
import { RoleDistributionChart } from "@/components/ui/roles/role-distribution-chart";
import { SkillsFrequencyChart } from "@/components/ui/roles/skills-frequency-chart";
import { PostingTimelineChart } from "@/components/ui/roles/posting-timeline-chart";
import { ExperienceBreakdownChart } from "@/components/ui/roles/experience-breakdown-chart";
import { slugify } from "@/lib/slugify";
import { searchParamsCache } from "@/lib/search-params";
import { FilterBar } from "@/components/ui/filters/filter-bar";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function RolesPage({ searchParams }: PageProps) {
  console.log("🚀 [RolesPage] Starting page render");
  const pageStart = Date.now();

  try {
    // 1. Parse the URL params
    console.log("📝 [RolesPage] Parsing search params...");
    const filters = await searchParamsCache.parse(searchParams);
    console.log("✅ [RolesPage] Filters:", filters);

    // 2. Fetch roles
    console.log("📊 [RolesPage] Fetching top job roles...");
    const rolesStart = Date.now();
    const roles = await getTopJobRoles(20, filters, Number(filters.page ?? 1));
    console.log(
      `✅ [RolesPage] Got ${roles.length} roles in ${Date.now() - rolesStart}ms`,
    );

    // 2b. Fetch analytics data in parallel
    console.log("📈 [RolesPage] Fetching analytics...");
    const analyticsStart = Date.now();
    const [
      avgSalary,
      topLocation,
      remotePercentage,
      roleDistribution,
      skillsFrequency,
      postingTimeline,
      experienceDistribution,
    ] = await Promise.all([
      getAverageSalary(filters),
      getTopLocation(filters),
      getRemotePercentage(filters),
      getRoleDistribution(10, filters),
      getSkillsFrequency(20, filters),
      getPostingTimeline(90, filters),
      getExperienceDistribution(filters),
    ]);
    console.log(
      `✅ [RolesPage] Got analytics in ${Date.now() - analyticsStart}ms`,
    );

    // 3. Fetch time series
    console.log("📈 [RolesPage] Fetching timeseries...");
    const tsStart = Date.now();
    const tsRows = await getTopRolesTimeSeries(roles.length || 20);
    console.log(
      `✅ [RolesPage] Got ${tsRows.length} timeseries rows in ${Date.now() - tsStart}ms`,
    );

    // 4. Build map
    console.log("🗺️ [RolesPage] Building timeseries map...");
    const timeseriesMap = new Map<string, { day: string; count: number }[]>();
    for (const row of tsRows) {
      const list = timeseriesMap.get(row.title) ?? [];
      list.push({ day: row.day, count: row.count });
      timeseriesMap.set(row.title, list);
    }
    console.log(`✅ [RolesPage] Map has ${timeseriesMap.size} entries`);

    console.log(`🎉 [RolesPage] Total page time: ${Date.now() - pageStart}ms`);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="pb-2">
          <h1 className="text-3xl font-bold mb-4">Explore Roles</h1>
        </div>

        {/* Stats Grid */}
        <StatsGrid
          totalRoles={
            roles.length > 0
              ? roleDistribution.reduce((sum, r) => sum + r.count, 0)
              : 0
          }
          avgSalary={avgSalary}
          topLocation={{
            location: topLocation?.location ?? "N/A",
            count: topLocation?.count ?? 0,
          }}
          remotePercentage={remotePercentage}
        />

        {/* Role Distribution Chart */}
        <RoleDistributionChart data={roleDistribution} />

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
                href={
                  slugify(r.title) ? `/roles/${slugify(r.title)}` : undefined
                }
              />
            ))}
          </div>
        ) : (
          /* Empty State if filters return nothing */
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

        {/* Advanced Analytics Section */}
        <div className="mt-8 space-y-6">
          <h2 className="text-2xl font-bold">Detailed Analytics</h2>

          {/* Two column layout for charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PostingTimelineChart data={postingTimeline} />
            <ExperienceBreakdownChart data={experienceDistribution} />
          </div>

          {/* Skills frequency full width */}
          <SkillsFrequencyChart data={skillsFrequency} />
        </div>
      </div>
    );
  } catch (error) {
    console.error("❌ [RolesPage] Error:", error);
    throw error;
  }
}
