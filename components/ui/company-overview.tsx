import React from "react";
import { getTotalCompanyStats } from "@/db/queries";
import { StatCard } from "./stat-card";
import { Building2, ClipboardList, Crown } from "lucide-react";

export const CompanyOverview = async () => {
  const stats = await getTotalCompanyStats();
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard
        title="Market Snapshot"
        value={stats.total_companies.toLocaleString()}
        description="Total Companies Hiring"
        icon={Building2}
      />
      <StatCard
        title="Job Volume"
        value={stats.total_postings.toLocaleString()}
        description="Active Opportunities"
        icon={ClipboardList}
      />
      <StatCard
        title="Hiring Leader"
        value={stats.top_company_name}
        description={`${stats.top_company_postings.toLocaleString()} open roles`}
        icon={Crown}
      />
    </div>
  );
};
