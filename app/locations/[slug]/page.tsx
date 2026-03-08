// Data updates throughout the day; ISR keeps pages fresh without forcing per-request SSR.
export const revalidate = 1800;

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getLocationStats,
  getTopSkillsByLocation,
  getTopCompaniesByLocation,
  getRecentJobsByLocation,
} from "@/db/queries";

import { EnhancedHero } from "@/components/location/EnhancedHero";
import { AnimatedStatCard } from "@/components/location/AnimatedStatCard";
import { MarketHealthCard } from "@/components/location/MarketHealthCard";
import { SalaryDistributionChart } from "@/components/location/SalaryDistributionChart";
import { WorkModeChart } from "@/components/location/WorkModeChart";
import { SkillsVisualization } from "@/components/location/SkillsVisualization";
import { CompaniesChart } from "@/components/location/CompaniesChart";
import { MarketInsightsPanel } from "@/components/location/MarketInsightsPanel";
import { JobsSection } from "@/components/location/JobsSection";
import { MobilePageShell } from "@/components/ui/mobile/mobile-page-shell";

interface PageProps {
  params: Promise<{ slug: string }>;
}

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return { title: "Location Not Found" };

  const stats = await getLocationStats(slug);
  if (!stats) return { title: "Location Not Found" };

  const locationName = [stats.city, stats.state, stats.country].filter(Boolean).join(", ");
  const totalJobs = Number(stats.totalJobs ?? 0);

  return {
    title: `${locationName} Tech Jobs — Salary & Market Data`,
    description: `${totalJobs.toLocaleString()} tech job postings in ${locationName}. Explore salary benchmarks, top companies, and in-demand skills.`,
    openGraph: {
      title: `${locationName} | Job Market Analytics`,
      description: `Live job market data for ${locationName}: roles, salaries, and hiring trends.`,
      type: "website",
    },
  };
}

export default async function LocationDetailPage({ params }: PageProps) {
  const { slug: locationSlug } = await params;

  if (!locationSlug) {
    notFound();
  }

  async function resolveStatsAndSlug(slug: string) {
    let stats = await getLocationStats(slug);
    if (stats) {
      return { stats, slugUsed: slug };
    }

    const parts = slug.split("-");

    for (let i = 0; i < parts.length; i++) {
      const potentialState = parts[i];
      if (!STATE_ABBREVIATIONS[potentialState]) continue;

      const abbreviatedParts = [...parts];
      abbreviatedParts[i] = STATE_ABBREVIATIONS[potentialState];

      const abbreviatedSlug = abbreviatedParts.join("-");
      stats = await getLocationStats(abbreviatedSlug);
      if (stats) {
        return { stats, slugUsed: abbreviatedSlug };
      }

      if (abbreviatedParts.length > 2) {
        const withoutCountry = abbreviatedParts.slice(0, -1).join("-");
        stats = await getLocationStats(withoutCountry);
        if (stats) {
          return { stats, slugUsed: withoutCountry };
        }
      }
    }

    for (let len = parts.length - 1; len >= 1; len--) {
      const candidate = parts.slice(0, len).join("-");
      stats = await getLocationStats(candidate);
      if (stats) {
        return { stats, slugUsed: candidate };
      }
    }

    if (parts.length > 2 && parts[parts.length - 1].length === 2) {
      const withoutCountry = parts.slice(0, -1).join("-");
      stats = await getLocationStats(withoutCountry);
      if (stats) {
        return { stats, slugUsed: withoutCountry };
      }
    }

    return { stats: null, slugUsed: slug };
  }

  const { stats, slugUsed } = await resolveStatsAndSlug(locationSlug);

  if (!stats) {
    console.error("Location not found:", { locationSlug, slugUsed });
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
    <MobilePageShell>
      <EnhancedHero
        locationName={locationName}
        stats={stats}
        recentJobs={recentJobs}
      />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
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

      <div className="mb-8">
        <SalaryDistributionChart
          avgMinSalary={stats.medianMinSalary ?? stats.avgMinSalary}
          avgMedSalary={stats.medianSalary ?? stats.avgMedSalary}
          avgMaxSalary={stats.medianMaxSalary ?? stats.avgMaxSalary}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WorkModeChart jobs={recentJobs} />
        <SkillsVisualization skills={topSkills} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CompaniesChart companies={topCompanies} />
        <MarketInsightsPanel
          stats={stats}
          topSkills={topSkills}
          recentJobs={recentJobs}
        />
      </div>

      <div className="mt-8">
        <JobsSection jobs={recentJobs} />
      </div>
    </MobilePageShell>
  );
}

