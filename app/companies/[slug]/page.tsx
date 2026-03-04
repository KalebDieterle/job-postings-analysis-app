// Data updates throughout the day; ISR keeps pages fresh without forcing per-request SSR.
export const revalidate = 1800;

import { notFound } from "next/navigation";
import {
  getCompanyBySlug,
  getCompanyJobStats,
  getCompanyPostingsTimeSeries,
  getCompanyLocationDistribution,
  getCompanyExperienceLevels,
  getCompanySalaryDistribution,
  getCompanyTopRoles,
  getCompanyTopSkills,
  getCompanyRecentPostings,
} from "@/db/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Globe, ArrowRight } from "lucide-react";
import { MobilePageShell } from "@/components/ui/mobile/mobile-page-shell";
import { MobileSection } from "@/components/ui/mobile/mobile-section";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function formatMonthLabel(month: string) {
  const [yearPart, monthPart] = month.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return month;
  }
  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export default async function CompanySlugPage({ params }: PageProps) {
  const { slug } = await params;
  let company;

  try {
    company = await getCompanyBySlug(slug);
  } catch (error) {
    console.error("Error fetching company:", error);
    notFound();
  }

  if (!company) {
    notFound();
  }

  const [
    jobStats,
    topRoles,
    topSkills,
    recentJobs,
    postingsTimelineRaw,
    locationDistributionRaw,
    experienceLevelsRaw,
    salaryDistributionRaw,
  ] = await Promise.all([
    getCompanyJobStats(company.name),
    getCompanyTopRoles(company.name),
    getCompanyTopSkills(company.name),
    getCompanyRecentPostings(company.name),
    getCompanyPostingsTimeSeries(company.name),
    getCompanyLocationDistribution(company.name),
    getCompanyExperienceLevels(company.name),
    getCompanySalaryDistribution(company.name),
  ]);

  const postingsTimeline = postingsTimelineRaw
    .map((row) => ({
      month: String(row.month ?? ""),
      count: Number(row.count ?? 0),
    }))
    .filter((row) => row.month.length > 0)
    .slice(-12);

  const latestTimelinePoint = postingsTimeline[postingsTimeline.length - 1];
  const previousTimelinePoint = postingsTimeline[postingsTimeline.length - 2];
  const momentumDelta =
    previousTimelinePoint && Number(previousTimelinePoint.count) > 0
    ? ((latestTimelinePoint?.count ?? 0) - Number(previousTimelinePoint?.count ?? 0)) /
      Number(previousTimelinePoint?.count ?? 1)
    : null;

  const locationDistribution = locationDistributionRaw.map((row) => ({
    location: String(row.location ?? "Unknown"),
    count: Number(row.count ?? 0),
  }));
  const totalLocationPostings = locationDistribution.reduce(
    (sum, row) => sum + row.count,
    0,
  );
  const maxLocationCount = Math.max(
    ...locationDistribution.map((row) => row.count),
    1,
  );

  const experienceLevels = experienceLevelsRaw.map((row) => ({
    level: String(row.experience_level ?? "Not specified"),
    count: Number(row.count ?? 0),
  }));
  const totalExperienceCount = experienceLevels.reduce(
    (sum, row) => sum + row.count,
    0,
  );
  const maxExperienceCount = Math.max(
    ...experienceLevels.map((row) => row.count),
    1,
  );

  const salaryDistribution = salaryDistributionRaw.map((row) => ({
    range: String(row.salary_range ?? "Unknown"),
    count: Number(row.count ?? 0),
  }));
  const totalSalaryBucketCount = salaryDistribution.reduce(
    (sum, row) => sum + row.count,
    0,
  );
  const maxSalaryRangeCount = Math.max(
    ...salaryDistribution.map((row) => row.count),
    1,
  );

  const remotePercent = jobStats.total_postings
    ? Math.round(
        (Number(jobStats.remote_count ?? 0) / Number(jobStats.total_postings)) *
          100,
      )
    : null;

  return (
    <MobilePageShell className="pb-8">
      <section className="relative flex min-h-48 items-end overflow-hidden rounded-xl p-5 glass-card md:min-h-55 md:p-8">
        <div className="flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded bg-primary/20 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
              Company
            </span>
            <span className="text-xs text-muted-foreground md:text-sm">
              Company Intelligence Profile
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-6xl">
            {company.name}
          </h1>
          <div className="mt-4 flex flex-wrap gap-2 text-slate-300 md:gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-xs md:text-sm">
                {company.city}, {company.state}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-xs md:text-sm">{company.country || "Industry"}</span>
            </div>
          </div>
        </div>

        {company.url ? (
          <div className="ml-4 shrink-0">
            <Button asChild className="rounded-xl px-4 py-2 md:px-5 md:py-3">
              <a
                href={company.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2"
              >
                Visit LinkedIn
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl p-4 glass-card md:p-6">
          <CardHeader>
            <CardTitle className="text-sm text-slate-400">Total Postings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold md:text-3xl">{jobStats.total_postings}</div>
            <div className="mt-1 text-sm text-emerald-400">Recent</div>
          </CardContent>
        </Card>

        <Card className="rounded-xl p-4 glass-card md:p-6">
          <CardHeader>
            <CardTitle className="text-sm text-slate-400">Active Postings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold md:text-3xl">{jobStats.active_postings}</div>
            <div className="mt-1 text-sm text-emerald-400">Live roles</div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-primary/30 bg-primary/5 p-4 glass-card md:p-6">
          <CardHeader>
            <CardTitle className="text-sm text-slate-400">Median Salary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary md:text-3xl">
              {jobStats.median_salary ?? jobStats.avg_salary
                ? `$${Number(jobStats.median_salary ?? jobStats.avg_salary).toLocaleString()}`
                : "N/A"}
            </div>
            <div className="mt-1 text-sm text-emerald-400">Median / Benchmark</div>
          </CardContent>
        </Card>

        <Card className="rounded-xl p-4 glass-card md:p-6">
          <CardHeader>
            <CardTitle className="text-sm text-slate-400">Remote %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold md:text-3xl">
              {remotePercent !== null ? `${remotePercent}%` : "N/A"}
            </div>
            <div className="mt-1 text-sm text-emerald-400">Remote-friendly roles</div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-xl border bg-card">
          <CardHeader className="space-y-2">
            <CardTitle className="text-lg">Hiring Momentum (12 Months)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Monthly posting volume for {company.name}
            </p>
            {latestTimelinePoint ? (
              <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
                <span className="rounded-full bg-muted px-3 py-1">
                  Latest: {formatMonthLabel(latestTimelinePoint.month)} (
                  {latestTimelinePoint.count.toLocaleString()})
                </span>
                <span
                  className={`rounded-full px-3 py-1 ${
                    momentumDelta === null
                      ? "bg-muted text-muted-foreground"
                      : momentumDelta >= 0
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-amber-500/10 text-amber-500"
                  }`}
                >
                  {momentumDelta === null
                    ? "No previous month baseline"
                    : `MoM ${
                        momentumDelta >= 0 ? "+" : ""
                      }${(momentumDelta * 100).toFixed(1)}%`}
                </span>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {postingsTimeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No monthly posting data is available yet.
              </p>
            ) : (
              postingsTimeline.map((point) => {
                const widthPct =
                  latestTimelinePoint && latestTimelinePoint.count > 0
                    ? Math.max(
                        (point.count / latestTimelinePoint.count) * 100,
                        4,
                      )
                    : 4;
                return (
                  <div key={point.month} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatMonthLabel(point.month)}</span>
                      <span>{point.count.toLocaleString()}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${Math.min(widthPct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-card">
          <CardHeader className="space-y-2">
            <CardTitle className="text-lg">Location Footprint</CardTitle>
            <p className="text-sm text-muted-foreground">
              Top hiring locations by posting share
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {locationDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No location distribution data is available.
              </p>
            ) : (
              locationDistribution.map((row) => {
                const widthPct = Math.max((row.count / maxLocationCount) * 100, 4);
                const sharePct =
                  totalLocationPostings > 0
                    ? (row.count / totalLocationPostings) * 100
                    : 0;
                return (
                  <div key={row.location} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate pr-3">{row.location}</span>
                      <span>
                        {row.count.toLocaleString()} ({sharePct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-sky-500/70"
                        style={{ width: `${Math.min(widthPct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-card">
          <CardHeader className="space-y-2">
            <CardTitle className="text-lg">Experience Mix</CardTitle>
            <p className="text-sm text-muted-foreground">
              Experience-level demand distribution
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {experienceLevels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No experience-level data is available.
              </p>
            ) : (
              experienceLevels.map((row) => {
                const widthPct = Math.max((row.count / maxExperienceCount) * 100, 4);
                const sharePct =
                  totalExperienceCount > 0
                    ? (row.count / totalExperienceCount) * 100
                    : 0;
                return (
                  <div key={row.level} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate pr-3">{row.level}</span>
                      <span>
                        {row.count.toLocaleString()} ({sharePct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-violet-500/70"
                        style={{ width: `${Math.min(widthPct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-card">
          <CardHeader className="space-y-2">
            <CardTitle className="text-lg">Salary Band Profile</CardTitle>
            <p className="text-sm text-muted-foreground">
              Distribution of jobs by annual salary range
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {salaryDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No salary-range distribution data is available.
              </p>
            ) : (
              salaryDistribution.map((row) => {
                const widthPct = Math.max((row.count / maxSalaryRangeCount) * 100, 4);
                const sharePct =
                  totalSalaryBucketCount > 0
                    ? (row.count / totalSalaryBucketCount) * 100
                    : 0;
                return (
                  <div key={row.range} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{row.range}</span>
                      <span>
                        {row.count.toLocaleString()} ({sharePct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500/70"
                        style={{ width: `${Math.min(widthPct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="overflow-hidden rounded-xl border bg-card lg:col-span-7">
          <div className="border-b px-4 py-4 md:px-6">
            <h2 className="text-lg font-bold">Top Roles</h2>
          </div>

          <div className="space-y-3 p-4 md:hidden">
            {topRoles.slice(0, 8).map((role) => (
              <div key={`mobile-${role.title}`} className="rounded-lg border p-3">
                <div className="text-sm font-semibold">{role.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {role.count} openings
                </div>
                <div className="mt-2 text-sm font-medium text-primary">
                  {role.median_salary ?? role.avg_salary
                    ? `$${Number(role.median_salary ?? role.avg_salary).toLocaleString()}`
                    : "N/A"}
                </div>
              </div>
            ))}
          </div>

          <MobileSection
            collapsible
            defaultOpen={false}
            title="Full Roles Table"
            className="p-4"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-muted-foreground">
                      Role Name
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase text-muted-foreground">
                      Openings
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-muted-foreground">
                      Median Salary
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topRoles.map((role) => (
                    <tr key={role.title} className="transition-colors hover:bg-muted">
                      <td className="px-6 py-4 text-sm font-medium">{role.title}</td>
                      <td className="px-6 py-4 text-center text-sm text-muted-foreground">
                        {role.count}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-300">
                        {role.median_salary ?? role.avg_salary
                          ? `$${Number(role.median_salary ?? role.avg_salary).toLocaleString()}`
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MobileSection>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card lg:col-span-5">
          <div className="border-b px-4 py-4 md:px-6">
            <h2 className="text-lg font-bold">In-Demand Skills</h2>
          </div>
          <div className="flex flex-wrap gap-2 p-4 md:gap-3 md:p-6">
            {topSkills.map((skill) => (
              <span
                key={skill.skill_name}
                className={`rounded-full px-3 py-1 text-xs md:text-sm ${
                  skill.count > 50
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-slate-300"
                }`}
              >
                {skill.skill_name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-4 md:px-6">
          <h2 className="text-lg font-bold">Recent Job Postings</h2>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {recentJobs.map((job) => (
            <div key={`mobile-job-${job.job_id}`} className="rounded-lg border p-3">
              <p className="text-sm font-semibold">{job.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{job.location}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${
                    job.remote_allowed
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {job.remote_allowed ? "Remote" : "On-site"}
                </span>
                <span className="text-slate-300">
                  {job.min_salary
                    ? `$${job.min_salary.toLocaleString()} - $${job.max_salary?.toLocaleString() || ""}`
                    : "N/A"}
                </span>
              </div>
              {job.job_posting_url ? (
                <a
                  href={job.job_posting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
                >
                  Apply
                </a>
              ) : null}
            </div>
          ))}
        </div>

        <MobileSection
          collapsible
          defaultOpen={false}
          title="Full Jobs Table"
          className="p-4"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted">
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-muted-foreground">
                    Position Title
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-muted-foreground">
                    Location
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-muted-foreground">
                    Salary Range
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentJobs.map((job) => (
                  <tr key={job.job_id} className="transition-colors hover:bg-muted">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold">{job.title}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{job.location}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-300">
                      {job.min_salary
                        ? `$${job.min_salary.toLocaleString()} - $${job.max_salary?.toLocaleString() || ""}`
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-2 text-xs font-semibold ${
                          job.remote_allowed ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {job.remote_allowed ? "Remote" : "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {job.job_posting_url ? (
                        <a
                          href={job.job_posting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-1.5 font-bold text-primary transition-colors hover:bg-primary/20"
                        >
                          Apply
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unavailable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MobileSection>
      </section>
    </MobilePageShell>
  );
}

