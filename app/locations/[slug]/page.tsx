import { notFound } from "next/navigation";
import {
  getLocationStats,
  getTopSkillsByLocation,
  getTopCompaniesByLocation,
  getRecentJobsByLocation,
} from "@/db/queries";
import { formatSalary } from "@/lib/location-utils";

// Import new enhanced components
import { EnhancedHero } from "@/components/location/EnhancedHero";
import { AnimatedStatCard } from "@/components/location/AnimatedStatCard";
import { MarketHealthCard } from "@/components/location/MarketHealthCard";
import { SalaryDistributionChart } from "@/components/location/SalaryDistributionChart";
import { WorkModeChart } from "@/components/location/WorkModeChart";
import { SkillsVisualization } from "@/components/location/SkillsVisualization";
import { CompaniesChart } from "@/components/location/CompaniesChart";
import { MarketInsightsPanel } from "@/components/location/MarketInsightsPanel";
import { JobsSection } from "@/components/location/JobsSection";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Map full state names to abbreviations
const STATE_ABBREVIATIONS: Record<string, string> = {
  alabama: "al",
  alaska: "ak",
  arizona: "az",
  arkansas: "ar",
  california: "ca",
  colorado: "co",
  connecticut: "ct",
  delaware: "de",
  florida: "fl",
  georgia: "ga",
  hawaii: "hi",
  idaho: "id",
  illinois: "il",
  indiana: "in",
  iowa: "ia",
  kansas: "ks",
  kentucky: "ky",
  louisiana: "la",
  maine: "me",
  maryland: "md",
  massachusetts: "ma",
  michigan: "mi",
  minnesota: "mn",
  mississippi: "ms",
  missouri: "mo",
  montana: "mt",
  nebraska: "ne",
  nevada: "nv",
  "new-hampshire": "nh",
  "new-jersey": "nj",
  "new-mexico": "nm",
  "new-york": "ny",
  "north-carolina": "nc",
  "north-dakota": "nd",
  ohio: "oh",
  oklahoma: "ok",
  oregon: "or",
  pennsylvania: "pa",
  "rhode-island": "ri",
  "south-carolina": "sc",
  "south-dakota": "sd",
  tennessee: "tn",
  texas: "tx",
  utah: "ut",
  vermont: "vt",
  virginia: "va",
  washington: "wa",
  "west-virginia": "wv",
  wisconsin: "wi",
  wyoming: "wy",
  "district-of-columbia": "dc",
  "puerto-rico": "pr",
};

export default async function LocationDetailPage({ params }: PageProps) {
  const { slug: locationSlug } = await params;

  if (!locationSlug) {
    notFound();
  }

  // Enhanced slug resolution with state abbreviation handling
  async function resolveStatsAndSlug(slug: string) {
    console.log("🔍 Attempting to resolve slug:", slug);

    // Strategy 1: Try exact slug match
    let stats = await getLocationStats(slug);
    if (stats) {
      console.log("✅ Found with exact match:", slug);
      return { stats, slugUsed: slug };
    }

    // Strategy 2: Convert full state name to abbreviation
    // Expected format: city-state-country or city-state
    const parts = slug.split("-");

    // Try to identify and replace state name with abbreviation
    for (let i = 0; i < parts.length; i++) {
      const potentialState = parts[i];

      // Check if this part is a full state name
      if (STATE_ABBREVIATIONS[potentialState]) {
        const abbreviatedParts = [...parts];
        abbreviatedParts[i] = STATE_ABBREVIATIONS[potentialState];
        const abbreviatedSlug = abbreviatedParts.join("-");

        console.log(
          `🔄 Trying with abbreviated state (${potentialState} → ${STATE_ABBREVIATIONS[potentialState]}):`,
          abbreviatedSlug,
        );
        stats = await getLocationStats(abbreviatedSlug);
        if (stats) {
          console.log("✅ Found with state abbreviation:", abbreviatedSlug);
          return { stats, slugUsed: abbreviatedSlug };
        }

        // Also try without the country code
        if (abbreviatedParts.length > 2) {
          const withoutCountry = abbreviatedParts.slice(0, -1).join("-");
          console.log("🔄 Trying abbreviated without country:", withoutCountry);
          stats = await getLocationStats(withoutCountry);
          if (stats) {
            console.log(
              "✅ Found abbreviated without country:",
              withoutCountry,
            );
            return { stats, slugUsed: withoutCountry };
          }
        }
      }
    }

    // Strategy 3: Try progressively shorter slug candidates
    for (let len = parts.length - 1; len >= 1; len--) {
      const candidate = parts.slice(0, len).join("-");
      console.log("🔄 Trying shorter slug:", candidate);

      stats = await getLocationStats(candidate);
      if (stats) {
        console.log("✅ Found with shorter slug:", candidate);
        return { stats, slugUsed: candidate };
      }
    }

    // Strategy 4: Try without country code (last part if it looks like a country code)
    if (parts.length > 2 && parts[parts.length - 1].length === 2) {
      const withoutCountry = parts.slice(0, -1).join("-");
      console.log("🔄 Trying without country code:", withoutCountry);

      stats = await getLocationStats(withoutCountry);
      if (stats) {
        console.log("✅ Found without country code:", withoutCountry);
        return { stats, slugUsed: withoutCountry };
      }
    }

    console.log("❌ No match found for slug:", slug);
    return { stats: null, slugUsed: slug };
  }

  const { stats, slugUsed } = await resolveStatsAndSlug(locationSlug);

  if (!stats) {
    console.error("Location not found:", {
      originalSlug: locationSlug,
      attemptedSlug: slugUsed,
    });
    notFound();
  }

  const [topSkills, topCompanies, recentJobs] = await Promise.all([
    getTopSkillsByLocation(slugUsed),
    getTopCompaniesByLocation(slugUsed),
    getRecentJobsByLocation(slugUsed, 10),
  ]);

  const locationName = [stats.city, stats.state, stats.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Enhanced Hero with quick stats */}
      <EnhancedHero
        locationName={locationName}
        stats={stats}
        recentJobs={recentJobs}
      />

      {/* Market Health Score + Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MarketHealthCard stats={stats} />
        <AnimatedStatCard
          icon="briefcase"
          label="Total Jobs"
          value={Number(stats.totalJobs)}
          trend={8}
          gradientFrom="from-blue-500"
          gradientTo="to-blue-600"
        />
        <AnimatedStatCard
          icon="building"
          label="Active Companies"
          value={Number(stats.totalCompanies)}
          trend={5}
          gradientFrom="from-purple-500"
          gradientTo="to-purple-600"
        />
      </div>

      {/* Salary Distribution Chart */}
      <div className="mb-8">
        <SalaryDistributionChart
          avgMinSalary={stats.avgMinSalary}
          avgMedSalary={stats.avgMedSalary}
          avgMaxSalary={stats.avgMaxSalary}
        />
      </div>

      {/* Charts Row 1: Work Mode & Skills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <WorkModeChart jobs={recentJobs} />
        <SkillsVisualization skills={topSkills} />
      </div>

      {/* Charts Row 2: Companies & Market Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <CompaniesChart companies={topCompanies} />
        <MarketInsightsPanel
          stats={stats}
          topSkills={topSkills}
          recentJobs={recentJobs}
        />
      </div>

      {/* Enhanced Jobs Section with Filters */}
      <div className="mt-8">
        <JobsSection jobs={recentJobs} />
      </div>
    </div>
  );
}
