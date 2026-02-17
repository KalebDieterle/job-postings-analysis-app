import Header from "../components/ui/Header";
import {
  getTrendingSkills,
  getTotalStats,
  getIndustryBreakdown,
  getTopHiringCompanies,
  getSalaryInsights,
  getRecentPostings,
  getExperienceDistribution,
} from "@/db/queries";

// Import home page components
import { HeroStats } from "@/components/ui/home/hero-stats";
import { IndustryBreakdownChart } from "@/components/ui/home/industry-breakdown-chart";
import { TopCompaniesGrid } from "@/components/ui/home/top-companies-grid";
import { ExperienceDonutChart } from "@/components/ui/home/experience-donut-chart";
import { SalaryInsightsPanel } from "@/components/ui/home/salary-insights-panel";
import { RecentActivityFeed } from "@/components/ui/home/recent-activity-feed";
import { QuickActionGrid } from "@/components/ui/home/quick-action-grid";
import { EnhancedTrendingSkills } from "@/components/ui/home/enhanced-trending-skills";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Fetch all data in parallel
  const [
    statsData,
    industryData,
    companiesData,
    salaryData,
    recentPostings,
    experienceData,
    trendingSkillsRaw,
  ] = await Promise.all([
    getTotalStats(),
    getIndustryBreakdown(),
    getTopHiringCompanies(),
    getSalaryInsights(),
    getRecentPostings(),
    getExperienceDistribution(),
    getTrendingSkills(30, 10),
  ]);

  // Format trending skills for the enhanced chart
  const trendingSkills = trendingSkillsRaw.map((s: any) => ({
    skill_name: s.name ?? s.skill_name ?? "",
    current_count: s.currentCount ?? s.count ?? 0,
    previous_count:
      s.previousCount ?? Math.floor((s.currentCount ?? s.count ?? 0) * 0.7), // fallback estimate
    growth_rate: s.growthRate ?? 0,
  }));

  return (
    <>
      <Header />

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Stats Section */}
        <section>
          <HeroStats data={statsData} />
        </section>

        {/* Quick Actions */}
        <section>
          <QuickActionGrid />
        </section>

        {/* Two Column Layout - Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <IndustryBreakdownChart data={industryData} />
          <ExperienceDonutChart data={experienceData} />
        </section>

        {/* Salary Insights */}
        <section>
          <SalaryInsightsPanel data={salaryData} />
        </section>

        {/* Enhanced Trending Skills */}
        <section>
          <EnhancedTrendingSkills data={trendingSkills} />
        </section>

        {/* Two Column Layout - Companies & Recent Activity */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TopCompaniesGrid data={companiesData} />
          </div>
          <div>
            <RecentActivityFeed data={recentPostings} />
          </div>
        </section>
      </div>
    </>
  );
}
