import React from "react";
import { CompanyCardPerRole } from "@/components/ui/company-card-per-role";

export function TopCompaniesList({
  companies,
}: {
  companies: { name: string; count: number }[];
}) {
  if (!companies || companies.length === 0) {
    return (
      <div className="border rounded-xl p-6 bg-card">
        <h3 className="text-lg font-semibold mb-2">Top Employers</h3>
        <p className="text-sm text-muted-foreground">
          No employers found for this skill.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-xl p-6 bg-card">
      <h3 className="text-lg font-semibold mb-4">Top Employers</h3>
      <div className="grid gap-3">
        {companies.map((c, i) => (
          <CompanyCardPerRole
            key={c.name}
            name={c.name}
            count={c.count}
            rank={i + 1}
          />
        ))}
      </div>
    </div>
  );
}
