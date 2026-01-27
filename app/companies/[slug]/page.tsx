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
    <div className="min-h-screen bg-slate-950 text-white p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-b border-slate-800 pb-6">
          <h1 className="text-4xl font-bold">{company.name}</h1>
          <p className="text-slate-400 mt-1">
            {company.city}, {company.state} | {company.country}
          </p>
          {company.url && (
            <a
              href={company.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 underline mt-1 block"
            >
              Visit LinkedIn
            </a>
          )}
        </header>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border border-slate-800">
            <CardHeader>
              <CardTitle>Total Job Postings</CardTitle>
            </CardHeader>
            <CardContent>{jobStats.total_postings}</CardContent>
          </Card>
          <Card className="bg-slate-900 border border-slate-800">
            <CardHeader>
              <CardTitle>Active Postings</CardTitle>
            </CardHeader>
            <CardContent>{jobStats.active_postings}</CardContent>
          </Card>
          <Card className="bg-slate-900 border border-slate-800">
            <CardHeader>
              <CardTitle>Average Salary</CardTitle>
            </CardHeader>
            <CardContent>
              $
              {Number(jobStats.avg_salary).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border border-slate-800">
            <CardHeader>
              <CardTitle>Remote Positions</CardTitle>
            </CardHeader>
            <CardContent>{jobStats.remote_count}</CardContent>
          </Card>
        </div>

        {/* Top Roles */}
        <Card className="bg-slate-900 border border-slate-800">
          <CardHeader>
            <CardTitle>Top Roles</CardTitle>
            <CardDescription>
              Most common positions at this company
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Avg Salary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topRoles.map((role) => (
                  <TableRow key={role.title}>
                    <TableCell>{role.title}</TableCell>
                    <TableCell>{role.count}</TableCell>
                    <TableCell>
                      ${Number(role.avg_salary || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Skills */}
        <Card className="bg-slate-900 border border-slate-800">
          <CardHeader>
            <CardTitle>Top Skills</CardTitle>
            <CardDescription>
              Most in-demand skills for this company
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {topSkills.map((skill) => (
                <li key={skill.skill_name}>
                  {skill.skill_name} ({skill.count})
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card className="bg-slate-900 border border-slate-800">
          <CardHeader>
            <CardTitle>Recent Job Postings</CardTitle>
            <CardDescription>Latest openings</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Remote</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentJobs.map((job) => (
                  <TableRow key={job.job_id}>
                    <TableCell>{job.title}</TableCell>
                    <TableCell>{job.location}</TableCell>
                    <TableCell>
                      {job.min_salary
                        ? `$${job.min_salary.toLocaleString()} - $${job.max_salary?.toLocaleString() || ""}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>{job.remote_allowed ? "Yes" : "No"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
