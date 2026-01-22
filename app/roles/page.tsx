import React from "react";
import { getTopJobRoles, getTopRolesTimeSeries } from "@/db/queries";
import RoleCard from "@/components/ui/role-card";
import { slugify } from "@/lib/slugify";
import { searchParamsCache } from "@/lib/search-params";
import { FilterBar } from "@/components/ui/filters/filter-bar";

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
    const roles = await getTopJobRoles(20, filters);
    console.log(
      `✅ [RolesPage] Got ${roles.length} roles in ${Date.now() - rolesStart}ms`,
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
        {/* 3. Add the FilterBar at the top */}
        <div className="pb-2">
          <h1 className="text-3xl font-bold mb-4">Explore Roles</h1>
          <FilterBar />
        </div>

        {/* 4. Display Results */}
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
      </div>
    );
  } catch (error) {
    console.error("❌ [RolesPage] Error:", error);
    throw error;
  }
}
