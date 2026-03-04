// Data updates throughout the day; ISR keeps pages fresh without forcing per-request SSR.
export const revalidate = 1800;

import {
  getTrendingSkills,
  getTrendingStats,
  getSourceCountrySegmentation,
} from "@/db/queries";
import { TrendingSkillCard } from "@/components/ui/trending/trending-skill-card-v2";
import { TrendingFilters } from "@/components/ui/trending/trending-filters";
import { TrendsExportButton } from "@/components/ui/trending/trends-export-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Flame,
  ArrowUpRight,
  TrendingUp,
  Target,
  DollarSign,
  Sparkles,
  Calendar,
  Info,
} from "lucide-react";
import { Suspense } from "react";
import { categorizeSkill } from "@/lib/skill-helpers";
import { MobilePageHeader } from "@/components/ui/mobile/mobile-page-header";
import { MobilePageShell } from "@/components/ui/mobile/mobile-page-shell";
import { formatGrowthPercentage } from "@/lib/utils";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// Stat card component with glassmorphic style
function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  className,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}) {
  return (
    <div className={`glass-card p-5 space-y-3 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <div className="h-10 w-10 rounded-lg glass-subtle flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {trend && (
          <Badge className={trendUp ? "trend-badge-up" : "trend-badge-neutral"}>
            {trend}
          </Badge>
        )}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

async function TrendingContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const parsedParams = await searchParams;
  const rawTimeframe =
    typeof parsedParams.timeframe === "string"
      ? Number.parseInt(parsedParams.timeframe, 10)
      : 7;
  const timeframe = [7, 30, 90].includes(rawTimeframe) ? rawTimeframe : 7;
  const sortBy =
    parsedParams.sortBy === "salary" || parsedParams.sortBy === "demand"
      ? parsedParams.sortBy
      : "demand";

  const [trendingSkillsRaw, stats, segmentation] = await Promise.all([
    getTrendingSkills(timeframe, 24, sortBy),
    getTrendingStats(timeframe),
    getSourceCountrySegmentation(timeframe),
  ]);

  // Transform snake_case to camelCase for UI
  const trendingSkills = trendingSkillsRaw.map((s) => ({
    name: String(s.name ?? ""),
    currentCount: Number(s.current_count ?? 0),
    previousCount: Number(s.previous_count ?? 0),
    currentSalary: Number(s.current_salary ?? 0),
    previousSalary: Number(s.previous_salary ?? 0),
    growthPercentage: Number(s.growth_percentage ?? 0),
    salaryChange: Number(s.salary_change ?? 0),
    trendStatus: s.trend_status,
    comparisonMode: s.comparison_mode ?? stats.comparisonMode,
    category: categorizeSkill(String(s.name ?? "")),
  }));
  const showPercentGrowth = stats.comparisonMode === "contiguous";
  const comparisonWindow = stats.comparisonWindow;
  const currentWindowText = comparisonWindow
    ? `${comparisonWindow.currentStart} to ${comparisonWindow.currentEnd}`
    : "current window";
  const previousWindowText = comparisonWindow
    ? `${comparisonWindow.previousStart} to ${comparisonWindow.previousEnd}`
    : "previous window";

  const comparisonMessage =
    stats.comparisonMode === "fallback"
      ? `Detected a data gap between ${previousWindowText} and ${currentWindowText}. Percent growth is hidden for this timeframe because windows are not contiguous.`
      : stats.comparisonMode === "none"
        ? `Trends for ${currentWindowText} are shown without a valid earlier baseline. Percent growth is unavailable for this timeframe.`
        : `Trends compare ${currentWindowText} against the prior ${timeframe}-day window (${previousWindowText}), anchored to the latest posting date.`;

  const topGainerTrend =
    !showPercentGrowth
      ? "N/A"
      : formatGrowthPercentage(stats.topGainerGrowth, { decimals: 1 });
  const marketMomentumValue =
    !showPercentGrowth
      ? "N/A"
      : formatGrowthPercentage(stats.avgGrowth, { decimals: 1 });

  // Separate breakout skills from regular trending
  const breakoutSkills = trendingSkills.filter(
    (s) => s.trendStatus === "breakout",
  );
  const regularTrending = trendingSkills.filter(
    (s) => s.trendStatus !== "breakout",
  );
  const sourceBreakdown = segmentation.sourceBreakdown;
  const countryBreakdown = segmentation.countryBreakdown;
  const maxSourceCount = Math.max(
    ...sourceBreakdown.map((row) => row.postingCount),
    1,
  );
  const maxCountryCount = Math.max(
    ...countryBreakdown.map((row) => row.postingCount),
    1,
  );

  const formatMoney = (value: number) =>
    value > 0 ? `$${Math.round(value).toLocaleString()}` : "N/A";
  const formatSourceLabel = (value: string) =>
    value
      .split(/[_-]/g)
      .map((token) =>
        token.length > 0 ? token[0].toUpperCase() + token.slice(1) : token,
      )
      .join(" ");

  return (
    <div className="space-y-8">
      {/* Snapshot Comparison Info Banner */}
      <div className="glass-card p-4 border-l-4 border-blue-500">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">Window Comparison</p>
            <p className="text-sm text-muted-foreground">
              {comparisonMessage}
            </p>
          </div>
        </div>
      </div>

      {/* Data Freshness Indicator */}
      {stats.dataAsOf && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            Data as of{" "}
            <span className="font-medium text-foreground">
              {stats.dataAsOf}
            </span>
          </span>
        </div>
      )}

      {/* Stats Overview - Bento Grid */}
      <div className="bento-grid">
        <StatCard
          label="Top Gainer"
          value={stats.topGainer}
          icon={TrendingUp}
          trend={topGainerTrend}
          trendUp={showPercentGrowth}
          className="bento-card-featured glow-success"
        />
        <StatCard
          label="Market Momentum"
          value={marketMomentumValue}
          icon={Target}
        />
        <StatCard
          label="Highest Salary Jump"
          value={stats.highestSalaryJump}
          icon={DollarSign}
          trend={`+$${Math.round(stats.highestSalaryIncrease / 1000)}k`}
          trendUp={true}
        />
        <StatCard
          label="New Entries"
          value={String(stats.newEntries)}
          icon={Sparkles}
          trend={`${timeframe} days`}
        />
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">Source Segmentation</h3>
              <p className="text-sm text-muted-foreground">
                Top posting sources in {segmentation.window.start} to{" "}
                {segmentation.window.end}
              </p>
            </div>
            <Badge variant="outline" className="glass-subtle border-0">
              {segmentation.totalPostings.toLocaleString()} postings
            </Badge>
          </div>

          {sourceBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Source segmentation is not available for this window.
            </p>
          ) : (
            sourceBreakdown.map((row) => (
              <div key={row.source} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-xs md:text-sm">
                  <span className="font-medium">{formatSourceLabel(row.source)}</span>
                  <span className="text-muted-foreground">
                    {row.postingCount.toLocaleString()} ({row.sharePct.toFixed(1)}%) /{" "}
                    {formatMoney(row.medianSalary)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{
                      width: `${Math.min(
                        Math.max((row.postingCount / maxSourceCount) * 100, 4),
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="glass-card p-5 space-y-4">
          <div>
            <h3 className="text-lg font-bold">Country Segmentation</h3>
            <p className="text-sm text-muted-foreground">
              Leading countries by posting volume and salary baseline
            </p>
          </div>

          {countryBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Country segmentation is not available for this window.
            </p>
          ) : (
            countryBreakdown.map((row) => (
              <div key={row.country} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-xs md:text-sm">
                  <span className="font-medium">{row.country}</span>
                  <span className="text-muted-foreground">
                    {row.postingCount.toLocaleString()} ({row.sharePct.toFixed(1)}%) /{" "}
                    {formatMoney(row.medianSalary)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500/70"
                    style={{
                      width: `${Math.min(
                        Math.max((row.postingCount / maxCountryCount) * 100, 4),
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      {/* Filters */}
      <div className="glass-card p-4">
        <TrendingFilters />
      </div>

      {/* Breakout Skills Section */}
      {breakoutSkills.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-orange-500 to-red-500 text-white glow-warning">
              <Flame className="h-4 w-4" />
              <span className="font-bold text-sm">Breakout Tech</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Emerging skills with explosive growth
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {breakoutSkills.map((skill, index) => (
              <Link
                key={skill.name}
                href={`/skills/${encodeURIComponent(skill.name.toLowerCase())}`}
                className="block"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: "fade-in 0.4s ease-out forwards",
                  opacity: 0,
                }}
              >
                <TrendingSkillCard
                  name={skill.name}
                  currentCount={skill.currentCount}
                  growthPercentage={skill.growthPercentage}
                  salaryChange={skill.salaryChange}
                  currentSalary={skill.currentSalary}
                  trendStatus={skill.trendStatus}
                  category={skill.category}
                  showGrowth={showPercentGrowth}
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Main Trending Section */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-primary" />
            Trending Skills
          </h2>
          <Badge variant="outline" className="glass-subtle border-0">
            Sorted by {sortBy === "demand" ? "demand" : "salary"} growth
          </Badge>
        </div>

        {regularTrending.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {regularTrending.map((skill, index) => (
              <Link
                key={skill.name}
                href={`/skills/${encodeURIComponent(skill.name.toLowerCase())}`}
                className="block"
                style={{
                  animationDelay: `${(breakoutSkills.length + index) * 50}ms`,
                  animation: "fade-in 0.4s ease-out forwards",
                  opacity: 0,
                }}
              >
                <TrendingSkillCard
                  name={skill.name}
                  currentCount={skill.currentCount}
                  growthPercentage={skill.growthPercentage}
                  salaryChange={skill.salaryChange}
                  currentSalary={skill.currentSalary}
                  trendStatus={skill.trendStatus}
                  category={skill.category}
                  showGrowth={showPercentGrowth}
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="glass-card p-12 text-center space-y-4">
            <div className="h-16 w-16 rounded-full glass-subtle flex items-center justify-center mx-auto">
              <Flame className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No trending data found</h3>
            <p className="text-muted-foreground">
              Try adjusting your timeframe or check back later.
            </p>
            <Button asChild variant="outline" className="glass-subtle border-0">
              <Link href="/skills">Browse All Skills</Link>
            </Button>
          </div>
        )}
      </section>

      {/* Insights Footer */}
      <div className="glass-card p-6 bg-linear-to-r from-primary/5 to-purple-500/5 glow-primary">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Stay Ahead of the Curve</h3>
            <p className="text-sm text-muted-foreground">
              Export trending data to track market momentum and plan your
              learning path
            </p>
          </div>
          <TrendsExportButton
            data={trendingSkills}
            timeframe={timeframe}
            sortBy={sortBy}
            comparisonMode={stats.comparisonMode}
            comparisonWindow={stats.comparisonWindow}
            dataAsOf={stats.dataAsOf}
          />
        </div>
      </div>
    </div>
  );
}

// Loading skeleton component with glassmorphic style
function TrendingGridSkeleton() {
  return (
    <div className="space-y-8">
      {/* Stats skeleton */}
      <div className="bento-grid">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton-card h-32" />
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="skeleton-line h-16 rounded-xl" />

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="skeleton-card h-72" />
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
    <MobilePageShell>
      {/* Header */}
      <MobilePageHeader
        title="Market Momentum"
        subtitle="Spot emerging trends and salary spikes before they go mainstream. Track the technologies shaping tomorrow&apos;s job market."
        className="max-w-3xl"
      />

      {/* Content with Suspense */}
      <Suspense fallback={<TrendingGridSkeleton />}>
        <TrendingContent searchParams={searchParams} />
      </Suspense>
    </MobilePageShell>
  );
}

