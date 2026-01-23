import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Briefcase,
  DollarSign,
  TrendingUp,
  Sparkles,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { CompanyCardPerRole } from "@/components/ui/company-card-per-role";
import { RoleSkillsChart } from "@/components/ui/charts/role-skills-chart";
import {
  getJobsByRole,
  getTopSkillsForRole,
  getTopCompaniesForRole,
  getRoleStats,
  getRoleGrowth, // Ensure this is exported in your db/queries.ts
} from "@/db/queries";

interface PageProps {
  params: Promise<{
    slug: string | string[];
  }>;
}

export default async function RoleDetailPage({ params }: PageProps) {
  console.log("🚀 [RoleDetailPage] Starting Render");
  const pageStart = Date.now();

  const { slug } = await params;
  const slugStr = Array.isArray(slug) ? slug.join("-") : (slug ?? "");

  if (!slugStr) notFound();

  // Convert slug to a readable Title (e.g., "software-engineer" -> "Software Engineer")
  const title = slugStr
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Parallel Fetching
  const [jobs, skills, companies, stats, growth] = await Promise.all([
    getJobsByRole(title, 50),
    getTopSkillsForRole(title, 10),
    getTopCompaniesForRole(title, 10),
    getRoleStats(title),
    getRoleGrowth(title),
  ]);

  console.log(
    `✅ [RoleDetailPage] Data fetched in ${Date.now() - pageStart}ms`,
  );

  // Handle Empty State
  if (jobs.length === 0) {
    return (
      <div className="container mx-auto p-6 pt-10 space-y-8">
        <Link href="/roles">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 -ml-2 text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Back to All Roles
          </Button>
        </Link>
        <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-slate-50/50">
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          <p className="text-muted-foreground">
            No active job postings found for this role in the current dataset.
          </p>
        </div>
      </div>
    );
  }

  // Derived Insight Data
  const totalJobs = Number(stats.total_jobs);
  const topSkillName =
    skills.length > 0 ? skills[0].skill_name : "Specialized skills";
  const isPositiveGrowth = growth >= 0;

  return (
    <div className="container mx-auto p-6 pt-8 max-w-7xl">
      {/* 1. Navigation */}
      <div className="flex items-center pb-6">
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

      <div className="space-y-10">
        {/* 2. THE INSIGHT HEADER */}
        <header className="relative overflow-hidden rounded-2xl border border-blue-100 bg-linear-to-br from-blue-50/50 via-white to-indigo-50/30 p-8 shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  Live Market Analysis
                </div>

                {/* Dynamic Growth Badge */}
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    isPositiveGrowth
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-amber-100 text-amber-700 border border-amber-200"
                  }`}
                >
                  {isPositiveGrowth ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  Postings {isPositiveGrowth ? "up" : "down"} {Math.abs(growth)}
                  % this month
                </div>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-slate-900">
                {title}
              </h1>

              <p className="text-lg text-slate-600 font-medium max-w-3xl leading-relaxed">
                {topSkillName} remains the most critical requirement for this
                role. Demand is currently{" "}
                {isPositiveGrowth ? "strengthening" : "shifting"} across{" "}
                {companies.length} tracked companies.
              </p>
            </div>

            {/* Contextual Stats Pill */}
            <div className="hidden lg:flex items-center gap-2 bg-white px-5 py-3 rounded-xl border border-blue-100 shadow-sm">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Award className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase text-slate-400 font-bold leading-tight">
                  Primary Skill
                </span>
                <span className="text-base font-bold text-slate-800">
                  {topSkillName}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* 3. Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Market Demand"
            value={totalJobs.toLocaleString()}
            icon={Briefcase}
            description="Total active positions"
          />
          <StatCard
            title="Avg Floor Salary"
            value={
              stats.avg_min_salary
                ? `$${Math.round(Number(stats.avg_min_salary)).toLocaleString()}`
                : "N/A"
            }
            icon={DollarSign}
            description="Entry-level average"
          />
          <StatCard
            title="Avg Ceiling Salary"
            value={
              stats.avg_max_salary
                ? `$${Math.round(Number(stats.avg_max_salary)).toLocaleString()}`
                : "N/A"
            }
            icon={DollarSign}
            description="Senior-level average"
          />
          <StatCard
            title="Hiring Velocity"
            value={growth > 5 ? "Fast" : growth > -5 ? "Stable" : "Cooling"}
            icon={TrendingUp}
            description="Based on 30-day trend"
          />
        </div>

        {/* 4. Content Layout: Charts and Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Skill Visualization */}
          <div className="lg:col-span-2">
            {skills.length > 0 ? (
              <RoleSkillsChart
                data={skills.map((s) => ({
                  skill_name: s.skill_name,
                  count: Number(s.count),
                }))}
                roleTitle={title}
              />
            ) : (
              <div className="h-full min-h-100 flex items-center justify-center border-2 border-dashed rounded-2xl text-muted-foreground">
                Insufficient skill data for visualization
              </div>
            )}
          </div>

          {/* Company Leaderboard */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <Building2 className="h-5 w-5 text-blue-600" />
                Top Hiring Companies
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {companies.map((company, index) => (
                <CompanyCardPerRole
                  key={company.company_name}
                  name={company.company_name}
                  count={Number(company.count)}
                  rank={index + 1}
                />
              ))}
              <footer></footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
