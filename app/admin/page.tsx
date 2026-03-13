// Always render at request time — health checks must be live.
export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  ExternalLink,
  ServerCrash,
  Sparkles,
  XCircle,
} from "lucide-react";

import { getAdminHealth } from "@/lib/admin-health";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobilePageHeader } from "@/components/ui/mobile/mobile-page-header";
import { MobilePageShell } from "@/components/ui/mobile/mobile-page-shell";
import { RefreshButton } from "@/components/ui/admin/refresh-button";
import type { AdzunaHealth, DbHealth, MlHealth } from "@/lib/admin-health";

// ── Status badge helpers ──────────────────────────────────────────────────────

type ServiceStatus = "ok" | "warning" | "degraded" | "critical" | "error";

function statusClass(status: ServiceStatus) {
  switch (status) {
    case "ok":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600";
    case "warning":
    case "degraded":
      return "border-amber-500/40 bg-amber-500/10 text-amber-600";
    case "critical":
    case "error":
      return "border-red-500/40 bg-red-500/10 text-red-600";
  }
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <Badge variant="outline" className={`gap-1.5 capitalize ${statusClass(status)}`}>
      {status === "ok" ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : status === "error" || status === "critical" ? (
        <XCircle className="h-3.5 w-3.5" />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5" />
      )}
      {status}
    </Badge>
  );
}

// ── Metric card (reused from data-health pattern) ─────────────────────────────

function MetricCard({ title, value, hint }: { title: string; value: string; hint: string }) {
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

// ── Quota progress bar ────────────────────────────────────────────────────────

function QuotaBar({ pct }: { pct: number }) {
  const color =
    pct >= 95
      ? "bg-red-500"
      : pct >= 80
        ? "bg-amber-500"
        : "bg-emerald-500";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

// ── DB service card ───────────────────────────────────────────────────────────

function DbCard({ db }: { db: DbHealth }) {
  return (
    <Card className="rounded-xl border bg-card">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Database</CardTitle>
        </div>
        <StatusBadge status={db.status} />
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Latency</span>
          <span className="font-medium">{db.latencyMs} ms</span>
        </div>
        {db.stats && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Postings</span>
              <span className="font-medium">{db.stats.total_postings.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Companies</span>
              <span className="font-medium">{db.stats.total_companies.toLocaleString()}</span>
            </div>
          </>
        )}
        {db.error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-600">
            {db.error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── ML service card ───────────────────────────────────────────────────────────

function MlCard({ ml }: { ml: MlHealth }) {
  return (
    <Card className="rounded-xl border bg-card">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">ML Service</CardTitle>
        </div>
        <StatusBadge status={ml.status} />
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Latency</span>
          <span className="font-medium">{ml.latencyMs} ms</span>
        </div>
        {ml.health && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Models loaded</span>
              <span className="font-medium">{ml.health.models_loaded ? "Yes" : "No"}</span>
            </div>
            {ml.health.version !== "unknown" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">{ml.health.version}</span>
              </div>
            )}
          </>
        )}
        {ml.error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-600">
            {ml.error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Adzuna quota card ─────────────────────────────────────────────────────────

function AdzunaCard({ adzuna }: { adzuna: AdzunaHealth }) {
  return (
    <Card className="rounded-xl border bg-card">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2">
          <ServerCrash className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Adzuna Quota</CardTitle>
        </div>
        <StatusBadge status={adzuna.status} />
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {adzuna.usage ? (
          (["daily", "weekly", "monthly"] as const).map((p) => {
            const period = adzuna.usage![p];
            return (
              <div key={p} className="space-y-1">
                <div className="flex justify-between capitalize">
                  <span className="text-muted-foreground">{p}</span>
                  <span className="font-medium">
                    {period.used} / {period.limit}
                  </span>
                </div>
                <QuotaBar pct={period.pct} />
              </div>
            );
          })
        ) : (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-600">
            {adzuna.error ?? "Usage data unavailable"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const health = await getAdminHealth();
  const { db, ml, adzuna, env, checkedAt } = health;

  const checkedAtFormatted = new Date(checkedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "long",
  });

  return (
    <MobilePageShell>
      <div className="flex items-start justify-between gap-4">
        <MobilePageHeader
          title="Backend Data"
          subtitle="Live service connectivity, database stats, ML status, and API quota."
          className="max-w-2xl"
        />
        <div className="shrink-0 pt-1">
          <RefreshButton />
        </div>
      </div>

      {/* ── Service health grid ── */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <DbCard db={db} />
        <MlCard ml={ml} />
        <AdzunaCard adzuna={adzuna} />
      </section>

      {/* ── DB stats row ── */}
      {db.stats && (
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard
            title="Total Postings"
            value={db.stats.total_postings.toLocaleString()}
            hint="Rows in postings table"
          />
          <MetricCard
            title="Total Companies"
            value={db.stats.total_companies.toLocaleString()}
            hint="Rows in companies table"
          />
          <MetricCard
            title="Total Skills"
            value={db.stats.total_skills.toLocaleString()}
            hint="Rows in skills table"
          />
          <MetricCard
            title="Job–Skill Links"
            value={db.stats.total_job_skills.toLocaleString()}
            hint="Rows in job_skills table"
          />
        </section>
      )}

      {/* ── Adzuna quota detail ── */}
      {adzuna.usage && (
        <Card className="rounded-xl border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Adzuna API Quota Detail</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-4">Period</th>
                  <th className="py-2 pr-4 text-right">Used</th>
                  <th className="py-2 pr-4 text-right">Limit</th>
                  <th className="py-2 pr-4 text-right">Remaining</th>
                  <th className="py-2 min-w-[120px]">Usage</th>
                </tr>
              </thead>
              <tbody>
                {(["daily", "weekly", "monthly"] as const).map((p) => {
                  const period = adzuna.usage![p];
                  return (
                    <tr key={p} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium capitalize">{p}</td>
                      <td className="py-2.5 pr-4 text-right">{period.used.toLocaleString()}</td>
                      <td className="py-2.5 pr-4 text-right">{period.limit.toLocaleString()}</td>
                      <td className="py-2.5 pr-4 text-right">{period.remaining.toLocaleString()}</td>
                      <td className="py-2.5 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <QuotaBar pct={period.pct} />
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {period.pct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── ML detail ── */}
      {ml.health && (
        <Card className="rounded-xl border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">ML Service Detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs uppercase text-muted-foreground">Status</p>
                <p className="mt-1 font-semibold capitalize">{ml.health.status}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs uppercase text-muted-foreground">Models Loaded</p>
                <p className={`mt-1 font-semibold ${ml.health.models_loaded ? "text-emerald-600" : "text-amber-600"}`}>
                  {ml.health.models_loaded ? "Yes" : "No"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs uppercase text-muted-foreground">Version</p>
                <p className="mt-1 font-semibold">{ml.health.version}</p>
              </div>
            </div>
            {ml.health.loaded_artifacts.length > 0 && (
              <div>
                <p className="mb-2 text-xs uppercase text-muted-foreground">Loaded Artifacts</p>
                <div className="flex flex-wrap gap-1.5">
                  {ml.health.loaded_artifacts.map((a) => (
                    <Badge key={a} variant="secondary" className="font-mono text-xs">
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Environment strip ── */}
      <Card className="rounded-xl border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Environment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase text-muted-foreground">NODE_ENV</p>
              <p className="mt-1 font-mono font-semibold">{env.nodeEnv}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase text-muted-foreground">Node Version</p>
              <p className="mt-1 font-mono font-semibold">{env.nodeVersion}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase text-muted-foreground">Checked At</p>
              <p className="mt-1 font-mono text-xs font-semibold">{checkedAtFormatted}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase text-muted-foreground">DB Latency</p>
              <p className="mt-1 font-mono font-semibold">{db.latencyMs} ms</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Link to data health ── */}
      <div className="flex items-center justify-end">
        <Link
          href="/data-health"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Full data integrity report
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </MobilePageShell>
  );
}
