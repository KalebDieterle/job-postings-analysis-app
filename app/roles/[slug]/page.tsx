import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Briefcase, DollarSign, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { CompanyCard } from "@/components/ui/company-card";
import { RoleSkillsChart } from "@/components/ui/charts/role-skills-chart";
import {
  getJobsByRole,
  getTopSkillsForRole,
  getTopCompaniesForRole,
  getRoleStats,
} from "@/db/queries";

interface PageProps {
  params: Promise<{
    slug: string | string[];
  }>;
}

export default async function RoleDetailPage({ params }: PageProps) {
  console.log("🚀 [RoleDetailPage] Starting");
  const pageStart = Date.now();

  const { slug } = await params;
  const slugStr = Array.isArray(slug) ? slug.join("-") : (slug ?? "");
  console.log("📝 [RoleDetailPage] Slug:", slugStr);

  if (!slugStr) notFound();

  const title = slugStr
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  console.log("📋 [RoleDetailPage] Title:", title);

  console.log("📊 [RoleDetailPage] Fetching all data...");
  const fetchStart = Date.now();

  const [jobs, skills, companies, stats] = await Promise.all([
    getJobsByRole(title, 50),
    getTopSkillsForRole(title, 10),
    getTopCompaniesForRole(title, 10),
    getRoleStats(title),
  ]);

  console.log(
    `✅ [RoleDetailPage] Data fetched in ${Date.now() - fetchStart}ms`,
  );
  console.log(`   - Jobs: ${jobs.length}`);
  console.log(`   - Skills: ${skills.length}`);
  console.log(`   - Companies: ${companies.length}`);
  console.log(`   - Stats:`, stats);

  // If no jobs found, show the empty state
  if (jobs.length === 0) {
    console.log("⚠️ [RoleDetailPage] No jobs found, showing empty state");
    return (
      <div className="container mx-auto p-6 pt-10 space-y-8">
        <Link href="/roles">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Back to All Roles
          </Button>
        </Link>
        <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          <p className="text-muted-foreground">
            No active job postings found for this role.
          </p>
        </div>
      </div>
    );
  }

  const totalJobs = Number(stats.total_jobs);
  const topSkillCount = skills.length > 0 ? Number(skills[0].count) : 0;

  console.log(`🎉 [RoleDetailPage] Total time: ${Date.now() - pageStart}ms`);

  return (
    <div className="container mx-auto p-6 pt-8">
      {/* 1. Dedicated Navigation Row */}
      <div className="flex items-center pb-6 mb-6 border-b border-border/40">
        <Link href="/roles">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 -ml-2 text-muted-foreground hover:text-foreground transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to All Roles
          </Button>
        </Link>
      </div>
      {/* 2. Main Page Content */}
      <div className="space-y-10">
        {/* Header section with more air */}
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
            {title}
          </h1>
          <p className="text-muted-foreground text-lg">
            Market analysis and hiring trends for the current quarter.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Positions"
            value={totalJobs.toLocaleString()}
            icon={Briefcase}
            description={`${topSkillCount} of ${totalJobs} have skill data`}
          />
          <StatCard
            title="Avg Min Salary"
            value={
              stats.avg_min_salary
                ? `$${Math.round(Number(stats.avg_min_salary)).toLocaleString()}`
                : "N/A"
            }
            icon={DollarSign}
            description="Average floor salary"
          />
          <StatCard
            title="Avg Max Salary"
            value={
              stats.avg_max_salary
                ? `$${Math.round(Number(stats.avg_max_salary)).toLocaleString()}`
                : "N/A"
            }
            icon={DollarSign}
            description="Average ceiling salary"
          />
          <StatCard
            title="Companies Hiring"
            value={companies.length}
            icon={TrendingUp}
            description="Unique employers"
          />
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {skills.length > 0 && (
              <RoleSkillsChart
                data={skills.map((s) => ({
                  skill_name: s.skill_name,
                  count: Number(s.count),
                }))}
                roleTitle={title}
              />
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top Hiring Companies
            </h2>
            <div className="flex flex-col gap-3">
              {companies.map((company, index) => (
                <CompanyCard
                  key={company.company_name}
                  name={company.company_name}
                  count={Number(company.count)}
                  rank={index + 1}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
