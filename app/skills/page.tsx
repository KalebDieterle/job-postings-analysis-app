import {
  getSkillsWithFilters,
  getSkillsAdvancedStats,
  getCategoryDistribution,
  getSkillGrowthStats,
  getSkillTimeline,
} from "@/db/queries";
import { SkillCard } from "@/components/ui/skills/skill-card";
import { FunctionalFilterBar } from "@/components/ui/filters/functional-filter-bar";
import { SmartQuickFilters } from "@/components/ui/skills/smart-quick-filters";
import { AdvancedStatsPanel } from "@/components/ui/skills/advanced-stats-panel";
import { CategoryBreakdownChart } from "@/components/ui/skills/category-breakdown-chart";
import { DemandSalaryScatter } from "@/components/ui/skills/demand-salary-scatter";
import { TrendingTimeline } from "@/components/ui/skills/trending-timeline";
import { SkillsTableView } from "@/components/ui/skills/skills-table-view";
import { ExportActions } from "@/components/ui/skills/export-actions";
import { PaginationControls } from "@/components/ui/skills/pagination-controls";
import { ViewToggle } from "@/components/ui/skills/view-toggle";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Search } from "lucide-react";
import { Suspense } from "react";
import { SkillsGridSkeleton } from "@/components/ui/skills/skills-grid-skeleton";
import { categorizeSkill } from "@/lib/skill-helpers";
import { skillsSearchParamsCache } from "@/lib/skills-search-params";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

async function SkillsContent({ searchParams }: { searchParams: SearchParams }) {
  const parsedParams = skillsSearchParamsCache.parse(await searchParams);
  const {
    q: search,
    category,
    demandMin,
    demandMax,
    salaryMin,
    salaryMax,
    experience,
    sort,
    view,
    page,
  } = parsedParams;

  const limit = 24;

  // Fetch skills with filters
  const skillsData = await getSkillsWithFilters({
    search,
    category,
    demandMin,
    demandMax,
    salaryMin,
    salaryMax,
    experience,
    sort,
    page,
    limit,
  });

  // Fetch advanced stats
  const stats = await getSkillsAdvancedStats();

  // Fetch category distribution for chart
  const categoryData = await getCategoryDistribution();

  // Fetch top 10 skills for timeline
  const topSkillNames = skillsData.slice(0, 10).map((s) => s.name);
  const timelineData =
    topSkillNames.length > 0
      ? await getSkillTimeline({ skillNames: topSkillNames, days: 90 })
      : [];

  // Prepare data for scatter plot
  const growthStats = await getSkillGrowthStats();
  const scatterData = skillsData.slice(0, 50).map((skill) => {
    const growth = growthStats.find((g) => g.skill_name === skill.name);
    return {
      name: skill.name,
      demand: Number(skill.count),
      salary: Number(skill.avg_salary),
      growth: growth?.growth_percentage,
      category: categorizeSkill(skill.name),
    };
  });

  const hasNextPage = skillsData.length === limit;
  const hasPrevPage = page > 1;

  const buildPageUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    params.set("page", pageNum.toString());
    if (search) params.set("q", search);
    if (category.length > 0)
      category.forEach((c) => params.append("category", c));
    if (demandMin > 0) params.set("demandMin", demandMin.toString());
    if (demandMax < 10000) params.set("demandMax", demandMax.toString());
    if (salaryMin > 40000) params.set("salaryMin", salaryMin.toString());
    if (salaryMax < 200000) params.set("salaryMax", salaryMax.toString());
    if (experience.length > 0)
      experience.forEach((e) => params.append("experience", e));
    if (sort !== "demand") params.set("sort", sort);
    if (view !== "grid") params.set("view", view);
    return `/skills?${params.toString()}`;
  };

  const totalSkills = skillsData.length;

  return (
    <>
      {/* Advanced Stats Panel */}
      <AdvancedStatsPanel stats={stats} />

      {/* Smart Quick Filters */}
      <SmartQuickFilters />

      {/* Category Breakdown Chart */}
      {categoryData.length > 0 && (
        <CategoryBreakdownChart
          data={categoryData.map((item) => ({
            category: item.category,
            count: item.count,
            percentage: 0, // Will be calculated in component
          }))}
        />
      )}

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xl font-bold">
          {search
            ? `Results for "${search}"`
            : category.length > 0
              ? `${category.join(", ")} Skills`
              : "All Skills"}
        </h4>
        <ViewToggle />
      </div>

      {/* Skills Grid or Table */}
      {skillsData.length > 0 ? (
        <>
          {view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {skillsData.map((skill) => (
                <Link
                  key={skill.name}
                  href={`/skills/${encodeURIComponent(skill.name.toLowerCase())}`}
                  className="transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <SkillCard
                    name={skill.name}
                    count={Number(skill.count)}
                    avgSalary={Number(skill.avg_salary)}
                    category={categorizeSkill(skill.name)}
                  />
                </Link>
              ))}
            </div>
          ) : (
            <SkillsTableView
              data={skillsData.map((skill) => {
                const growth = growthStats.find(
                  (g) => g.skill_name === skill.name,
                );
                return {
                  name: skill.name,
                  count: Number(skill.count),
                  avg_salary: Number(skill.avg_salary),
                  growth: growth?.growth_percentage,
                };
              })}
            />
          )}

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between py-6 border-t border-slate-200 dark:border-slate-800 gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing{" "}
              <span className="font-bold text-slate-900 dark:text-white">
                {(page - 1) * limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-bold text-slate-900 dark:text-white">
                {Math.min(page * limit, (page - 1) * limit + totalSkills)}
              </span>{" "}
              of{" "}
              <span className="font-bold text-slate-900 dark:text-white">
                {totalSkills}
              </span>{" "}
              skills
            </p>
            <PaginationControls
              currentPage={page}
              hasNextPage={hasNextPage}
              hasPrevPage={hasPrevPage}
              buildPageUrl={buildPageUrl}
            />
          </div>
        </>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No skills found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Try adjusting your search or filters to find what you're looking
              for.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Demand vs Salary Scatter Plot */}
      {scatterData.length > 0 && <DemandSalaryScatter data={scatterData} />}

      {/* Trending Timeline */}
      {timelineData.length > 0 && (
        <TrendingTimeline data={timelineData} skillNames={topSkillNames} />
      )}
    </>
  );
}

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const parsedParams = skillsSearchParamsCache.parse(await searchParams);

  // Fetch skills data for export
  const skillsData = await getSkillsWithFilters({
    search: parsedParams.q,
    category: parsedParams.category,
    demandMin: parsedParams.demandMin,
    demandMax: parsedParams.demandMax,
    salaryMin: parsedParams.salaryMin,
    salaryMax: parsedParams.salaryMax,
    experience: parsedParams.experience,
    sort: parsedParams.sort,
    page: parsedParams.page,
    limit: 24,
  });

  const exportData = skillsData.map((skill) => ({
    name: skill.name,
    count: Number(skill.count),
    avg_salary: Number(skill.avg_salary),
    category: categorizeSkill(skill.name),
  }));

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-4xl font-black tracking-tight lg:text-5xl">
            Skills Explorer
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">
            Analyze real-time demand, salary benchmarks, and industry trends
            across the global tech landscape.
          </p>
        </div>
        <ExportActions data={exportData} filters={parsedParams} />
      </div>

      {/* Functional Filter Bar */}
      <FunctionalFilterBar />

      {/* Content with Suspense */}
      <Suspense fallback={<SkillsGridSkeleton />}>
        <SkillsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
