import { getTrendingSkills, getTrendingStats } from "@/db/queries";
import { TrendingSkillCard } from "@/components/ui/trending/trending-skill-card";
import { TrendingFilters } from "@/components/ui/trending/trending-filters";
import { StatsOverview } from "@/components/ui/skills/stats-overview";
import { ViewToggle } from "@/components/ui/skills/view-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Flame, ArrowUpRight, Download } from "lucide-react";
import { Suspense } from "react";
import { categorizeSkill } from "@/lib/skill-helpers";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

async function TrendingContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const parsedParams = await searchParams;
  const timeframe =
    typeof parsedParams.timeframe === "string"
      ? parseInt(parsedParams.timeframe)
      : 30;
  const sortBy =
    typeof parsedParams.sortBy === "string"
      ? (parsedParams.sortBy as "demand" | "salary")
      : "demand";

  const [trendingSkills, stats] = await Promise.all([
    getTrendingSkills({ timeframe, limit: 24, sortBy }),
    getTrendingStats(timeframe),
  ]);

  // Separate breakout skills from regular trending
  const breakoutSkills = trendingSkills.filter(
    (s) => s.trendStatus === "breakout",
  );
  const regularTrending = trendingSkills.filter(
    (s) => s.trendStatus !== "breakout",
  );

  return (
    <>
      {/* Stats Overview */}
      <StatsOverview
        stats={[
          {
            label: "Top Gainer",
            value: stats.topGainer,
            iconName: "TrendingUp",
            trend: `+${stats.topGainerGrowth.toFixed(1)}%`,
            trendUp: true,
          },
          {
            label: "Market Momentum",
            value: `+${stats.avgGrowth.toFixed(1)}%`,
            iconName: "Target",
          },
          {
            label: "Highest Salary Jump",
            value: stats.highestSalaryJump,
            iconName: "DollarSign",
            trend: `+$${Math.round(stats.highestSalaryIncrease / 1000)}k`,
            trendUp: true,
          },
          {
            label: "New Entries",
            value: stats.newEntries,
            iconName: "Sparkles",
            trend: `${timeframe} days`,
          },
        ]}
      />

      {/* Filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <TrendingFilters />
        <ViewToggle />
      </div>

      {/* Breakout Skills Section */}
      {breakoutSkills.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white">
              <Flame className="h-4 w-4" />
              <span className="font-bold text-sm">Breakout Tech</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Emerging skills with explosive growth
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {breakoutSkills.map((skill) => (
              <Link
                key={skill.name}
                href={`/skills/${encodeURIComponent(skill.name.toLowerCase())}`}
                className="transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <TrendingSkillCard
                  name={skill.name}
                  currentCount={skill.currentCount}
                  growthPercentage={skill.growthPercentage}
                  salaryChange={skill.salaryChange}
                  currentSalary={skill.currentSalary}
                  trendStatus={skill.trendStatus}
                  category={categorizeSkill(skill.name)}
                />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main Trending Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-bold flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-primary" />
            Trending Skills
          </h4>
          <p className="text-sm text-muted-foreground">
            Sorted by {sortBy === "demand" ? "demand" : "salary"} growth
          </p>
        </div>

        {regularTrending.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {regularTrending.map((skill) => (
              <Link
                key={skill.name}
                href={`/skills/${encodeURIComponent(skill.name.toLowerCase())}`}
                className="transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <TrendingSkillCard
                  name={skill.name}
                  currentCount={skill.currentCount}
                  growthPercentage={skill.growthPercentage}
                  salaryChange={skill.salaryChange}
                  currentSalary={skill.currentSalary}
                  trendStatus={skill.trendStatus}
                  category={categorizeSkill(skill.name)}
                />
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Flame className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No trending data found
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Try adjusting your timeframe or check back later.
              </p>
              <Button asChild variant="outline">
                <Link href="/skills">Browse All Skills</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Insights Footer */}
      <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold">Stay Ahead of the Curve</h3>
              <p className="text-sm text-muted-foreground">
                Export trending data to track market momentum and plan your
                learning path
              </p>
            </div>
            <Button className="gap-2 shadow-sm">
              <Download className="h-4 w-4" />
              Export Trends
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Loading skeleton component
function TrendingGridSkeleton() {
  return (
    <div className="space-y-8">
      {/* Stats skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-32 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse"
          />
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="h-64 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-4xl font-black tracking-tight lg:text-5xl bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Market Momentum
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">
            Spot emerging trends and salary spikes before they go mainstream.
            Track the technologies shaping tomorrow's job market.
          </p>
        </div>
      </div>

      {/* Content with Suspense */}
      <Suspense fallback={<TrendingGridSkeleton />}>
        <TrendingContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
