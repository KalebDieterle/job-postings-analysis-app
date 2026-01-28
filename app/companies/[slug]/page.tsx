// be sure to convert to condensed components later

import { notFound } from "next/navigation";
import {
  getCompanyBySlug,
  getCompanyJobStats,
  getCompanyTopRoles,
  getCompanyTopSkills,
  getCompanyRecentPostings,
} from "@/db/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Globe, ArrowRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CompanySlugPage({ params }: PageProps) {
  const { slug } = await params;
  let company;

  try {
    company = await getCompanyBySlug(slug);
  } catch (error) {
    return (
      <div className="p-10 bg-red-950 text-white">
        <h1 className="text-2xl font-bold">Database Connection Error</h1>
        <pre className="mt-4 p-4 bg-black/50 rounded text-xs overflow-auto">
          {String(error)}
        </pre>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-10 text-white">
        <h1 className="text-2xl font-bold">Company Not Found</h1>
        <p>
          No company found with slug:{" "}
          <code className="bg-slate-800 px-2 py-1 rounded">{slug}</code>
        </p>
      </div>
    );
  }

  // Fetch related stats
  const jobStats = await getCompanyJobStats(company.name);
  const topRoles = await getCompanyTopRoles(company.name);
  const topSkills = await getCompanyTopSkills(company.name);
  const recentJobs = await getCompanyRecentPostings(company.name);

  return (
    <div className="min-h-screen bg-slate-950 text-white py-8">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-xl glass-card min-h-[220px] p-8 flex items-end">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">
                {company.fortune_rank ? "Fortune 500" : "Company"}
              </span>
              <span className="text-sm text-slate-300">
                {company.headline || "Company Intelligence Profile"}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight">
              {company.name}
            </h1>
            <div className="flex flex-wrap gap-3 mt-4 text-slate-300">
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  {company.city}, {company.state}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                <Globe className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  {company.industry || "Industry"}
                </span>
              </div>
            </div>
          </div>

          <div className="ml-6 flex-shrink-0">
            {company.url && (
              <Button asChild className="rounded-xl px-5 py-3">
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
            )}
          </div>
        </section>

        {/* Stats Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card rounded-xl p-6">
            <CardHeader>
              <CardTitle className="text-sm text-slate-400">
                Total Postings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {jobStats.total_postings}
              </div>
              <div className="text-sm text-emerald-400 mt-1">
                {jobStats.postings_change_pct ?? "+0%"}%
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card rounded-xl p-6">
            <CardHeader>
              <CardTitle className="text-sm text-slate-400">
                Active Postings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {jobStats.active_postings}
              </div>
              <div className="text-sm text-emerald-400 mt-1">Live roles</div>
            </CardContent>
          </Card>

          <Card className="glass-card rounded-xl p-6 border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-sm text-slate-400">
                Avg Salary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                ${Number(jobStats.avg_salary || 0).toLocaleString()}
              </div>
              <div className="text-sm text-emerald-400 mt-1">
                Median / Benchmark
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card rounded-xl p-6">
            <CardHeader>
              <CardTitle className="text-sm text-slate-400">Remote %</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {jobStats.remote_pct ?? "N/A"}%
              </div>
              <div className="text-sm text-emerald-400 mt-1">
                Remote-friendly roles
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Roles + Skills */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-card rounded-xl overflow-hidden border">
            <div className="px-6 py-4 flex items-center justify-between border-b">
              <h2 className="text-lg font-bold">Top Roles</h2>
              <button className="text-primary text-sm font-medium">
                View all
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">
                      Role Name
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground text-center uppercase">
                      Openings
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground text-right uppercase">
                      Avg Salary
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topRoles.map((role) => (
                    <tr
                      key={role.title}
                      className="hover:bg-muted transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium">
                        {role.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-muted-foreground">
                        {role.count}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-slate-300">
                        ${Number(role.avg_salary || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-5 bg-card rounded-xl border overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-bold">In-Demand Skills</h2>
            </div>
            <div className="p-6 flex flex-wrap gap-3">
              {topSkills.map((skill) => (
                <span
                  key={skill.skill_name}
                  className={`px-3 py-1 rounded-full ${skill.count > 50 ? "bg-primary/20 text-primary" : "bg-muted text-slate-300"}`}
                >
                  {skill.skill_name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Jobs */}
        <section className="bg-card rounded-xl border overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b">
            <h2 className="text-lg font-bold">Recent Job Postings</h2>
            <div className="flex gap-2">
              <button className="btn-secondary">Filter</button>
              <button className="btn-primary">See All Jobs</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted">
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">
                    Position Title
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">
                    Location
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">
                    Salary Range
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentJobs.map((job) => (
                  <tr
                    key={job.job_id}
                    className="hover:bg-muted transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{job.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {job.department || ""}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-black ${job.remote_allowed ? "bg-emerald-500/10 text-emerald-400" : "bg-primary/10 text-primary"}`}
                        >
                          {job.remote_allowed ? "Remote" : "On-site"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {job.location}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-300">
                      {job.min_salary
                        ? `$${job.min_salary.toLocaleString()} – $${job.max_salary?.toLocaleString() || ""}`
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-2 text-xs font-semibold ${job.remote_allowed ? "text-emerald-400" : "text-amber-400"}`}
                      >
                        {job.status || "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary/10 text-primary font-bold">
                        Apply
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t text-center">
            <button className="text-sm text-muted-foreground">
              Load more opportunities
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
