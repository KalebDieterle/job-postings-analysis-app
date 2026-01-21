import React from "react";
import { getTopJobRoles, getTopRolesTimeSeries } from "@/db/queries";
import RoleCard from "@/components/ui/role-card";
import { slugify } from "@/lib/slugify";
import { searchParamsCache } from "@/lib/search-params";
import { FilterBar } from "@/components/ui/filters/filter-bar";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const page = async ({ searchParams }: PageProps) => {
  // 1. Parse the URL params using our schema (Next.js 15 requires awaiting searchParams)
  const filters = await searchParamsCache.parse(searchParams);

  // 2. Pass filters to the database query
  // This will now filter by location, experience, and salary at the SQL level
  const roles = await getTopJobRoles(20, filters);
  
  // Fetch time series for these specific filtered roles
  const tsRows = await getTopRolesTimeSeries(roles.length || 20, 30);

  const timeseriesMap = new Map<string, { day: string; count: number }[]>();
  for (const row of tsRows) {
    const list = timeseriesMap.get(row.title) ?? [];
    list.push({ day: row.day, count: row.count });
    timeseriesMap.set(row.title, list);
  }

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
              href={slugify(r.title) ? `/roles/${slugify(r.title)}` : undefined}
            />
          ))}
        </div>
      ) : (
        /* Empty State if filters return nothing */
        <div className="py-20 text-center border-2 border-dashed rounded-xl bg-muted/10">
          <p className="text-muted-foreground">No roles found matching your filters.</p>
        </div>
      )}
    </div>
  );
};

export default page;