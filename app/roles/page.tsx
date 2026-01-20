import React from "react";
import { getTopJobRoles, getTopRolesTimeSeries } from "@/db/queries";
import RoleCard from "@/components/ui/role-card";
import { slugify } from "@/lib/slugify";

const page = async () => {
  const roles = await getTopJobRoles(20);
  const tsRows = await getTopRolesTimeSeries(roles.length || 20, 30);

  const timeseriesMap = new Map<string, { day: string; count: number }[]>();
  for (const row of tsRows) {
    const list = timeseriesMap.get(row.title) ?? [];
    list.push({ day: row.day, count: row.count });
    timeseriesMap.set(row.title, list);
  }

  return (
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
  );
};

export default page;
