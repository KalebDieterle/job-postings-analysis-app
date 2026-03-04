// Data updates throughout the day; ISR keeps pages fresh without forcing per-request SSR.
export const revalidate = 1800;

import { AlertTriangle, CheckCircle2, Database, RefreshCw } from "lucide-react";

import { getDataHealthDashboard } from "@/db/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobilePageHeader } from "@/components/ui/mobile/mobile-page-header";
import { MobilePageShell } from "@/components/ui/mobile/mobile-page-shell";

type AlertLevel = "high" | "medium";

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatDate(value: string | null) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
}

function formatDollars(value: number) {
  return value > 0 ? `$${value.toLocaleString()}` : "N/A";
}

function daysSince(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const diffMs = Date.now() - parsed.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

function MetricCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="rounded-xl border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default async function DataHealthPage() {
  const dashboard = await getDataHealthDashboard();
  const { summary, sourceBreakdown, countryBreakdown } = dashboard;
  const latestAgeDays = daysSince(summary.latestPostingAt);

  const alerts: Array<{ level: AlertLevel; message: string }> = [];
  if (summary.salaryCoveragePct < 55) {
    alerts.push({
      level: "high",
      message: "Salary coverage is below 55% of postings.",
    });
  }
  if (summary.skillCoveragePct < 70) {
    alerts.push({
      level: "medium",
      message: "Skill extraction coverage is below 70% of postings.",
    });
  }
  if (summary.companyLinkagePct < 80) {
    alerts.push({
      level: "medium",
      message: "Company linkage is below 80%; review company ID backfills.",
    });
  }
  if (summary.duplicateExternalKeys > 0) {
    alerts.push({
      level: "high",
      message: `${summary.duplicateExternalKeys.toLocaleString()} duplicate external/source/country keys detected.`,
    });
  }
  if (summary.totalPostings > 0 && summary.missingCountry / summary.totalPostings > 0.03) {
    alerts.push({
      level: "medium",
      message: "More than 3% of postings are missing country attribution.",
    });
  }
  if (latestAgeDays !== null && latestAgeDays > 14) {
    alerts.push({
      level: "medium",
      message: `Latest posting is ${latestAgeDays} days old. Ingestion may be stale.`,
    });
  }

  return (
    <MobilePageShell>
      <MobilePageHeader
        title="Data Health Dashboard"
        subtitle="Operational quality view across posting coverage, freshness, segmentation consistency, and ingestion integrity."
        className="max-w-4xl"
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Postings"
          value={summary.totalPostings.toLocaleString()}
          hint="Current warehouse row count"
        />
        <MetricCard
          title="Salary Coverage"
          value={formatPercent(summary.salaryCoveragePct)}
          hint={`${summary.salaryCovered.toLocaleString()} rows with quality annual salary`}
        />
        <MetricCard
          title="Skill Coverage"
          value={formatPercent(summary.skillCoveragePct)}
          hint={`${summary.jobsWithSkills.toLocaleString()} postings linked to at least one skill`}
        />
        <MetricCard
          title="Company Linkage"
          value={formatPercent(summary.companyLinkagePct)}
          hint={`${summary.companyLinked.toLocaleString()} postings linked to company_id`}
        />
        <MetricCard
          title="Location Coverage"
          value={formatPercent(summary.locationCoveragePct)}
          hint={`${summary.locationCovered.toLocaleString()} postings with non-empty location`}
        />
        <MetricCard
          title="Remote Field Coverage"
          value={formatPercent(summary.remoteFieldCoveragePct)}
          hint={`${summary.remotePresent.toLocaleString()} postings with remote flag populated`}
        />
        <MetricCard
          title="Missing Source / Country"
          value={`${summary.missingSource.toLocaleString()} / ${summary.missingCountry.toLocaleString()}`}
          hint="Rows with empty attribution fields"
        />
        <MetricCard
          title="Duplicate External Keys"
          value={summary.duplicateExternalKeys.toLocaleString()}
          hint="Duplicate rows across (external_id, source, country)"
        />
      </section>

      <Card className="rounded-xl border bg-card">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Freshness and Integrity Signals</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Latest posting date, stale inventory, and threshold-based alerts.
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
            Latest {formatDate(summary.latestPostingAt)}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase text-muted-foreground">Stale (&gt;90d)</p>
              <p className="mt-1 text-xl font-bold">{summary.stale90d.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase text-muted-foreground">Latest Posting</p>
              <p className="mt-1 text-xl font-bold">{formatDate(summary.latestPostingAt)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase text-muted-foreground">Age</p>
              <p className="mt-1 text-xl font-bold">
                {latestAgeDays === null ? "N/A" : `${latestAgeDays} days`}
              </p>
            </div>
          </div>

          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              All monitored health thresholds are within expected bounds.
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <div
                  key={`${alert.level}-${index}`}
                  className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                    alert.level === "high"
                      ? "border-red-500/40 bg-red-500/10 text-red-600"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-600"
                  }`}
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="rounded-xl border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-4 w-4" />
              Source Quality Segmentation
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3 text-right">Postings</th>
                  <th className="py-2 pr-3 text-right">Salary Cov.</th>
                  <th className="py-2 pr-3 text-right">Skill Cov.</th>
                  <th className="py-2 pr-3 text-right">Median Salary</th>
                  <th className="py-2 text-right">Latest</th>
                </tr>
              </thead>
              <tbody>
                {sourceBreakdown.map((row) => (
                  <tr key={row.source} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{row.source}</td>
                    <td className="py-2 pr-3 text-right">{row.postingCount.toLocaleString()}</td>
                    <td className="py-2 pr-3 text-right">{formatPercent(row.salaryCoveragePct)}</td>
                    <td className="py-2 pr-3 text-right">{formatPercent(row.skillCoveragePct)}</td>
                    <td className="py-2 pr-3 text-right">{formatDollars(row.medianSalary)}</td>
                    <td className="py-2 text-right">{formatDate(row.latestPostingAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-4 w-4" />
              Country Quality Segmentation
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">Country</th>
                  <th className="py-2 pr-3 text-right">Postings</th>
                  <th className="py-2 pr-3 text-right">Salary Cov.</th>
                  <th className="py-2 pr-3 text-right">Skill Cov.</th>
                  <th className="py-2 pr-3 text-right">Median Salary</th>
                  <th className="py-2 text-right">Latest</th>
                </tr>
              </thead>
              <tbody>
                {countryBreakdown.map((row) => (
                  <tr key={row.country} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{row.country}</td>
                    <td className="py-2 pr-3 text-right">{row.postingCount.toLocaleString()}</td>
                    <td className="py-2 pr-3 text-right">{formatPercent(row.salaryCoveragePct)}</td>
                    <td className="py-2 pr-3 text-right">{formatPercent(row.skillCoveragePct)}</td>
                    <td className="py-2 pr-3 text-right">{formatDollars(row.medianSalary)}</td>
                    <td className="py-2 text-right">{formatDate(row.latestPostingAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </MobilePageShell>
  );
}
