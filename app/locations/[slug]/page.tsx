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

export default async function LocationDetailPage({ params }: PageProps) {
  // In Next.js 15+, params is a Promise that must be awaited
  const { slug: locationSlug } = await params;

  if (!locationSlug) {
    notFound();
  }

  // Resolve stats first with a fallback slug strategy, then fetch related data
  async function resolveStatsAndSlug(slug: string) {
    let s = await getLocationStats(slug);
    if (s) return { stats: s, slugUsed: slug };

    // Try progressively shorter slug candidates (e.g. "city-state-country" -> "city-state" -> "city")
    const parts = slug.split("-");
    for (let len = parts.length - 1; len >= 1; len--) {
      const candidate = parts.slice(0, len).join("-");
      s = await getLocationStats(candidate);
      if (s) return { stats: s, slugUsed: candidate };
    }

    return { stats: null, slugUsed: slug };
  }

  const { stats, slugUsed } = await resolveStatsAndSlug(locationSlug);

  if (!stats) {
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
