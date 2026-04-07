// Data updates throughout the day; ISR keeps pages fresh without forcing per-request SSR.
export const revalidate = 1800;

import type { Metadata } from "next";
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
  getRoleGrowth,
  resolveCanonicalRoleSlug,
  getRelatedRoles,
} from "@/db/queries";
import { RoleSalaryPreview } from "@/components/ui/intelligence/role-salary-preview";
import { RelatedRolesSection } from "@/components/ui/roles/related-roles-section";
import { SkillGapRadar } from "@/components/ui/roles/skill-gap-radar";
import { MobilePageShell } from "@/components/ui/mobile/mobile-page-shell";

interface PageProps {
  params: Promise<{
    slug: string | string[];
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const slugStr = Array.isArray(slug) ? slug.join("-") : (slug ?? "");
  const fallbackTitle = slugStr
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const title = (await resolveCanonicalRoleSlug(slugStr)) ?? fallbackTitle;

  const [stats, skills] = await Promise.all([
    getRoleStats(title),
    getTopSkillsForRole(title, 3),
  ]);

  const topSkills = skills.map((s) => s.skill_name).join(", ");
  const medianFloor = stats.median_min_salary
    ? `$${Math.round(Number(stats.median_min_salary)).toLocaleString()}`
    : null;

  return {
    title: `${title} Jobs — Salary, Skills & Hiring Trends`,
    description: `Explore ${title} job market data. ${medianFloor ? `Median starting salary ${medianFloor}. ` : ""}${topSkills ? `Top skills: ${topSkills}.` : ""}`,
    openGraph: {
      title: `${title} | Job Market Analytics`,
      description: `Live market data for ${title} roles: salaries, in-demand skills, and top hiring companies.`,
      type: "website",
    },
  };
}

export default async function RoleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const slugStr = Array.isArray(slug) ? slug.join("-") : (slug ?? "");

  if (!slugStr) notFound();

  const fallbackTitle = slugStr
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  const title = (await resolveCanonicalRoleSlug(slugStr)) ?? fallbackTitle;

  // Parallel Fetching
  const [jobs, skills, companies, stats, growth, relatedRoles] = await Promise.all([
    getJobsByRole(title, 50),
    getTopSkillsForRole(title, 10),
    getTopCompaniesForRole(title, 10),
    getRoleStats(title),
    getRoleGrowth(title),
    getRelatedRoles(title, 5),
  ]);

  if (jobs.length === 0) {
    notFound();
  }

  // Derived Insight Data
  const totalJobs = Number(stats.total_jobs);
  const topSkillName =
    skills.length > 0 ? skills[0].skill_name : "Specialized skills";
  const safeGrowth = Number.isFinite(growth) ? growth : 0;
  const isPositiveGrowth = safeGrowth >= 0;

  // JSON-LD structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Occupation",
    "name": title,
    "occupationalCategory": title,
    "estimatedSalary": stats.median_min_salary
      ? [
          {
            "@type": "MonetaryAmountDistribution",
            "name": "Median entry salary",
            "currency": "USD",
            "duration": "P1Y",
            "percentile10": stats.median_min_salary,
            "median": stats.median_max_salary ?? stats.median_min_salary,
          },
        ]
      : undefined,
    "skills": skills.slice(0, 5).map((s) => s.skill_name).join(", "),
  };

  return (
    <MobilePageShell className="max-w-7xl pt-2 md:pt-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* 1. Navigation */}
      <div className="flex items-center pb-4 md:pb-6">
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

      <div className="space-y-6 md:space-y-10">
        {/* 2. THE INSIGHT HEADER */}
        <header className="relative overflow-hidden rounded-2xl border border-blue-100 bg-linear-to-br from-blue-50/50 via-white to-indigo-50/30 p-5 shadow-sm md:p-8">
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
                  Postings {isPositiveGrowth ? "up" : "down"}{" "}
                  {Math.abs(safeGrowth)}
                  % this month
                </div>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-4xl lg:text-5xl">
                {title}
              </h1>

              <p className="max-w-3xl text-sm font-medium leading-relaxed text-slate-600 md:text-lg">
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
            title="Median Floor Salary"
            value={
              stats.median_min_salary
                ? `$${Math.round(Number(stats.median_min_salary)).toLocaleString()}`
                : "N/A"
            }
            icon={DollarSign}
            description="Entry-level median"
          />
          <StatCard
            title="Median Ceiling Salary"
            value={
              stats.median_max_salary
                ? `$${Math.round(Number(stats.median_max_salary)).toLocaleString()}`
                : "N/A"
            }
            icon={DollarSign}
            description="Senior-level median"
          />
          <StatCard
            title="Hiring Velocity"
            value={
              safeGrowth > 5 ? "Fast" : safeGrowth > -5 ? "Stable" : "Cooling"
            }
            icon={TrendingUp}
            description="Based on 30-day trend"
          />
        </div>

        {/* ML Intelligence + Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RoleSalaryPreview roleTitle={title} />
          {skills.length >= 3 && (
            <SkillGapRadar
              data={skills.map((s) => ({
                skill: s.skill_name,
                count: Number(s.count),
              }))}
              roleTitle={title}
            />
          )}
        </div>

        {/* 4. Content Layout: Charts and Lists */}
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
                  key={`${company.company_name}-${index}`}
                  name={company.company_name}
                  count={Number(company.count)}
                  rank={index + 1}
                />
              ))}
              <footer></footer>
            </div>
          </div>
        </div>

        {/* 5. Related Roles */}
        <RelatedRolesSection roles={relatedRoles} />
      </div>
    </MobilePageShell>
  );
}
