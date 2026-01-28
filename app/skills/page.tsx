import { getAllSkills } from "@/db/queries";
import { SkillCard } from "@/components/ui/skills/skill-card";
import { FilterBar } from "@/components/ui/filters/filter-bar";
import { StatsOverview } from "@/components/ui/skills/stats-overview";
import { PaginationControls } from "@/components/ui/skills/pagination-controls";
import { CategoryPills } from "@/components/ui/skills/category-pills";
import { ViewToggle } from "@/components/ui/skills/view-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Search, Download, Sparkles } from "lucide-react";
import { Suspense } from "react";
import { SkillsGridSkeleton } from "@/components/ui/skills/skills-grid-skeleton";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

async function SkillsContent({ searchParams }: { searchParams: SearchParams }) {
  const parsedParams = await searchParams;
  const search = typeof parsedParams.q === "string" ? parsedParams.q : "";
  const page =
    typeof parsedParams.page === "string" ? parseInt(parsedParams.page) : 1;
  const limit = 24;

  const skillsData = await getAllSkills({
    search,
    page,
    limit,
  });

  const hasNextPage = skillsData.length === limit;
  const hasPrevPage = page > 1;

  const buildPageUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    params.set("page", pageNum.toString());
    if (search) params.set("q", search);
    return `/skills?${params.toString()}`;
  };

  // Calculate stats
  const totalSkills = skillsData.length;
  const avgDemand =
    totalSkills > 0
      ? Math.round(
          skillsData.reduce((sum, s) => sum + Number(s.count), 0) / totalSkills,
        )
      : 0;
  const avgSalary =
    totalSkills > 0
      ? Math.round(
          skillsData.reduce((sum, s) => sum + Number(s.avg_salary || 0), 0) /
            totalSkills,
        )
      : 0;
  const topSkill = skillsData[0];

  // Categorize skills (simple heuristic - you can enhance this)
  const categorizeSkill = (name: string): string => {
    const nameLower = name.toLowerCase();
    if (
      nameLower.includes("react") ||
      nameLower.includes("vue") ||
      nameLower.includes("angular")
    )
      return "Frontend";
    if (
      nameLower.includes("python") ||
      nameLower.includes("java") ||
      nameLower.includes("node")
    )
      return "Backend";
    if (
      nameLower.includes("aws") ||
      nameLower.includes("docker") ||
      nameLower.includes("kubernetes")
    )
      return "DevOps";
    if (
      nameLower.includes("sql") ||
      nameLower.includes("mongo") ||
      nameLower.includes("postgres")
    )
      return "Database";
    if (
      nameLower.includes("ios") ||
      nameLower.includes("android") ||
      nameLower.includes("mobile")
    )
      return "Mobile";
    if (
      nameLower.includes("cloud") ||
      nameLower.includes("azure") ||
      nameLower.includes("gcp")
    )
      return "Cloud";
    if (
      nameLower.includes("ml") ||
      nameLower.includes("ai") ||
      nameLower.includes("pytorch")
    )
      return "AI";
    return "Technology";
  };

  return (
    <>
      {/* Stats Overview */}
      <StatsOverview
        stats={[
          {
            label: "Total Skills",
            value: totalSkills,
            iconName: "Target",
            trend: search ? `for "${search}"` : undefined,
          },
          {
            label: "Avg. Demand",
            value: avgDemand.toLocaleString(),
            iconName: "TrendingUp",
          },
          {
            label: "Avg. Salary",
            value: avgSalary > 0 ? `$${(avgSalary / 1000).toFixed(0)}k` : "N/A",
            iconName: "DollarSign",
          },
          {
            label: "Top Skill",
            value: topSkill?.name || "N/A",
            iconName: "Sparkles",
          },
        ]}
      />

      {/* Category Pills */}
      <CategoryPills />

      {/* Section Header with View Toggle */}
      <div className="flex items-center justify-between">
        <h4 className="text-xl font-bold">
          {search ? `Results for "${search}"` : "Recommended Skills"}
        </h4>
        <ViewToggle />
      </div>

      {/* Skills Grid */}
      {skillsData.length > 0 ? (
        <>
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
            <Button asChild variant="outline">
              <Link href="/skills">Clear Filters</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
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
        <Button className="gap-2 shadow-sm">
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Search Bar */}
      <FilterBar />

      {/* Content with Suspense */}
      <Suspense fallback={<SkillsGridSkeleton />}>
        <SkillsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
