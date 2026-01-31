import { notFound } from "next/navigation";
import {
  getLocationStats,
  getTopSkillsByLocation,
  getTopCompaniesByLocation,
  getRecentJobsByLocation,
} from "@/db/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSalary } from "@/lib/location-utils";
import { MapPin, Briefcase, Building2, DollarSign } from "lucide-react";

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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <MapPin className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold">{locationName}</h1>
        </div>
        <p className="text-muted-foreground">
          Job market analysis and insights
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
                <p className="text-2xl font-bold">
                  {Number(stats.totalJobs).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Companies</p>
                <p className="text-2xl font-bold">
                  {Number(stats.totalCompanies).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Salary</p>
                <p className="text-2xl font-bold">
                  {formatSalary(Number(stats.avgMedSalary))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Salary Range */}
      {(stats.avgMinSalary || stats.avgMaxSalary) && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Salary Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.avgMinSalary && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Minimum</span>
                  <span className="font-semibold text-lg">
                    {formatSalary(Number(stats.avgMinSalary))}
                  </span>
                </div>
              )}
              {stats.avgMedSalary && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Average</span>
                  <span className="font-semibold text-lg">
                    {formatSalary(Number(stats.avgMedSalary))}
                  </span>
                </div>
              )}
              {stats.avgMaxSalary && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Maximum</span>
                  <span className="font-semibold text-lg">
                    {formatSalary(Number(stats.avgMaxSalary))}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Skills */}
        {topSkills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Skills in Demand</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topSkills.map((skill, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="font-medium">{skill.skillName}</span>
                    <span className="text-sm text-muted-foreground">
                      {Number(skill.count)} jobs
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Companies */}
        {topCompanies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Hiring Companies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCompanies.map((company, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{company.companyName}</p>
                      {company.companySize && (
                        <p className="text-xs text-muted-foreground">
                          {company.companySize}
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {Number(company.jobCount)} jobs
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Job Postings */}
      {recentJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Job Postings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentJobs.map((job) => (
                <div
                  key={job.jobId}
                  className="border-b last:border-0 pb-4 last:pb-0"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{job.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {job.companyName}
                      </p>
                    </div>
                    {job.remoteAllowed && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Remote
                      </span>
                    )}
                  </div>

                  <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                    {job.salaryMin && job.salaryMax && (
                      <span>
                        {formatSalary(job.salaryMin)} -{" "}
                        {formatSalary(job.salaryMax)}
                      </span>
                    )}
                    {job.experienceLevel && <span>{job.experienceLevel}</span>}
                    {job.listedTime && (
                      <span>
                        {new Date(job.listedTime).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
