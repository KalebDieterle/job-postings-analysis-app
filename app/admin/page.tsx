// Always render at request time — health checks must be live.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { getAdminHealth } from "@/lib/admin-health";
import { MobilePageHeader } from "@/components/ui/mobile/mobile-page-header";
import { MobilePageShell } from "@/components/ui/mobile/mobile-page-shell";
import { RefreshButton } from "@/components/ui/admin/refresh-button";
import type { AdzunaHealth, DbHealth, MlHealth } from "@/lib/admin-health";

// ── Status helpers ────────────────────────────────────────────────────────────

type ServiceStatus = "ok" | "warning" | "degraded" | "critical" | "error";

function statusColor(status: ServiceStatus): string {
  switch (status) {
    case "ok": return "var(--success)";
    case "warning":
    case "degraded": return "var(--warning)";
    case "critical":
    case "error": return "var(--destructive)";
  }
}

function statusLabel(status: ServiceStatus): string {
  switch (status) {
    case "ok": return "ONLINE";
    case "warning": return "WARNING";
    case "degraded": return "DEGRADED";
    case "critical": return "CRITICAL";
    case "error": return "ERROR";
  }
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const color = statusColor(status);
  return (
    <span
      className="text-xs font-bold uppercase tracking-widest px-2 py-0.5"
      style={{
        color,
        border: `1px solid color-mix(in srgb, ${color} 40%, transparent 60%)`,
        background: `color-mix(in srgb, ${color} 8%, transparent 92%)`,
        borderRadius: "2px",
        fontFamily: "var(--font-geist-mono), monospace",
        letterSpacing: "0.12em",
      }}
    >
      {statusLabel(status)}
    </span>
  );
}

// ── Quota bar ─────────────────────────────────────────────────────────────────

function QuotaBar({ pct }: { pct: number }) {
  const color = pct >= 95 ? "var(--destructive)" : pct >= 80 ? "var(--warning)" : "var(--success)";
  return (
    <div className="term-progress-track">
      <div style={{ width: `${Math.min(100, pct)}%`, background: color, height: "100%", borderRadius: "1px", transition: "width 0.6s ease" }} />
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="term-panel">
      <div className="term-panel-header">
        <span className="term-panel-title">{title}</span>
      </div>
      <div className="px-4 py-4">
        <div className="text-2xl font-bold" style={{ color: "var(--primary)", fontFamily: "var(--font-geist-mono), monospace" }}>
          {value}
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>[{">"} {hint}]</p>
      </div>
    </div>
  );
}

// ── Key-value row ─────────────────────────────────────────────────────────────

function KVRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: "var(--border)" }}>
      <span className="term-label">{label}</span>
      <span className="text-xs font-bold" style={{ color: valueColor ?? "var(--foreground)", fontFamily: "var(--font-geist-mono), monospace" }}>
        {value}
      </span>
    </div>
  );
}

// ── DB card ───────────────────────────────────────────────────────────────────

function DbCard({ db }: { db: DbHealth }) {
  return (
    <div className="term-panel">
      <div className="term-panel-header">
        <span className="term-panel-title">DATABASE</span>
        <StatusBadge status={db.status} />
      </div>
      <div className="px-4 py-3 space-y-0">
        <KVRow label="LATENCY" value={`${db.latencyMs}ms`} />
        {db.stats && (
          <>
            <KVRow label="POSTINGS" value={db.stats.total_postings.toLocaleString()} valueColor="var(--accent)" />
            <KVRow label="COMPANIES" value={db.stats.total_companies.toLocaleString()} valueColor="var(--accent)" />
          </>
        )}
        {db.error && (
          <p className="mt-2 px-2 py-1.5 text-xs" style={{ color: "var(--destructive)", border: "1px solid color-mix(in srgb, var(--destructive) 30%, transparent 70%)", borderRadius: "2px", background: "color-mix(in srgb, var(--destructive) 6%, transparent 94%)" }}>
            {">>>"} ERROR: {db.error}
          </p>
        )}
      </div>
    </div>
  );
}

// ── ML card ───────────────────────────────────────────────────────────────────

function MlCard({ ml }: { ml: MlHealth }) {
  return (
    <div className="term-panel">
      <div className="term-panel-header">
        <span className="term-panel-title">ML_SERVICE</span>
        <StatusBadge status={ml.status} />
      </div>
      <div className="px-4 py-3 space-y-0">
        <KVRow label="LATENCY" value={`${ml.latencyMs}ms`} />
        {ml.health && (
          <>
            <KVRow
              label="MODELS_LOADED"
              value={ml.health.models_loaded ? "TRUE" : "FALSE"}
              valueColor={ml.health.models_loaded ? "var(--success)" : "var(--warning)"}
            />
            {ml.health.version !== "unknown" && (
              <KVRow label="VERSION" value={ml.health.version} />
            )}
          </>
        )}
        {ml.error && (
          <p className="mt-2 px-2 py-1.5 text-xs" style={{ color: "var(--destructive)", border: "1px solid color-mix(in srgb, var(--destructive) 30%, transparent 70%)", borderRadius: "2px", background: "color-mix(in srgb, var(--destructive) 6%, transparent 94%)" }}>
            {">>>"} ERROR: {ml.error}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Adzuna card ───────────────────────────────────────────────────────────────

function AdzunaCard({ adzuna }: { adzuna: AdzunaHealth }) {
  return (
    <div className="term-panel">
      <div className="term-panel-header">
        <span className="term-panel-title">ADZUNA_QUOTA</span>
        <StatusBadge status={adzuna.status} />
      </div>
      <div className="px-4 py-3 space-y-3">
        {adzuna.usage ? (
          (["daily", "weekly", "monthly"] as const).map((p) => {
            const period = adzuna.usage![p];
            return (
              <div key={p} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="term-label">{p.toUpperCase()}</span>
                  <span className="text-xs font-bold" style={{ color: "var(--foreground)", fontFamily: "var(--font-geist-mono), monospace" }}>
                    {period.used}/{period.limit}
                    <span style={{ color: "var(--muted-foreground)" }}> ({period.pct.toFixed(0)}%)</span>
                  </span>
                </div>
                <QuotaBar pct={period.pct} />
              </div>
            );
          })
        ) : (
          <p className="px-2 py-1.5 text-xs" style={{ color: "var(--destructive)", border: "1px solid color-mix(in srgb, var(--destructive) 30%, transparent 70%)", borderRadius: "2px" }}>
            {">>>"} {adzuna.error ?? "USAGE_DATA_UNAVAILABLE"}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const health = await getAdminHealth();
  const { db, ml, adzuna, env, checkedAt } = health;

  const checkedAtFormatted = new Date(checkedAt).toISOString().replace("T", " ").slice(0, 19);

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

      {/* System log header */}
      <div className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-geist-mono), monospace" }}>
        <span style={{ color: "var(--accent)" }}>{">>>"}</span>{" "}
        HEALTH_CHECK_TIMESTAMP: {checkedAtFormatted} UTC
      </div>

      {/* ── Service cards ── */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <DbCard db={db} />
        <MlCard ml={ml} />
        <AdzunaCard adzuna={adzuna} />
      </section>

      {/* ── DB stats ── */}
      {db.stats && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard title="TOTAL_POSTINGS" value={db.stats.total_postings.toLocaleString()} hint="rows in postings table" />
          <MetricCard title="TOTAL_COMPANIES" value={db.stats.total_companies.toLocaleString()} hint="rows in companies table" />
          <MetricCard title="TOTAL_SKILLS" value={db.stats.total_skills.toLocaleString()} hint="rows in skills table" />
          <MetricCard title="JOB_SKILL_LINKS" value={db.stats.total_job_skills.toLocaleString()} hint="rows in job_skills table" />
        </section>
      )}

      {/* ── Adzuna quota table ── */}
      {adzuna.usage && (
        <div className="term-panel">
          <div className="term-panel-header">
            <span className="term-panel-title">ADZUNA_API_QUOTA_DETAIL</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-96 text-left" style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: "12px" }}>
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  {["PERIOD", "USED", "LIMIT", "REMAINING", "USAGE"].map((h) => (
                    <th key={h} className="px-4 py-2.5 term-label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["daily", "weekly", "monthly"] as const).map((p) => {
                  const period = adzuna.usage![p];
                  return (
                    <tr key={p} className="border-b" style={{ borderColor: "var(--border)" }}>
                      <td className="px-4 py-2.5 font-bold" style={{ color: "var(--foreground)" }}>{p.toUpperCase()}</td>
                      <td className="px-4 py-2.5" style={{ color: "var(--accent)" }}>{period.used.toLocaleString()}</td>
                      <td className="px-4 py-2.5" style={{ color: "var(--muted-foreground)" }}>{period.limit.toLocaleString()}</td>
                      <td className="px-4 py-2.5" style={{ color: "var(--success)" }}>{period.remaining.toLocaleString()}</td>
                      <td className="px-4 py-2.5 min-w-32">
                        <div className="flex items-center gap-2">
                          <QuotaBar pct={period.pct} />
                          <span style={{ color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{period.pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ML detail ── */}
      {ml.health && (
        <div className="term-panel">
          <div className="term-panel-header">
            <span className="term-panel-title">ML_SERVICE_DETAIL</span>
          </div>
          <div className="px-4 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {[
                { label: "STATUS", value: ml.health.status.toUpperCase(), color: ml.health.status === "ok" ? "var(--success)" : "var(--warning)" },
                { label: "MODELS_LOADED", value: ml.health.models_loaded ? "TRUE" : "FALSE", color: ml.health.models_loaded ? "var(--success)" : "var(--warning)" },
                { label: "VERSION", value: ml.health.version, color: "var(--foreground)" },
              ].map(({ label, value, color }) => (
                <div key={label} className="term-panel p-3">
                  <p className="term-label mb-1">{label}</p>
                  <p className="text-sm font-bold" style={{ color, fontFamily: "var(--font-geist-mono), monospace" }}>{value}</p>
                </div>
              ))}
            </div>

            {ml.health.loaded_artifacts.length > 0 && (
              <div>
                <p className="term-label mb-2">LOADED_ARTIFACTS</p>
                <div className="flex flex-wrap gap-1.5">
                  {ml.health.loaded_artifacts.map((a) => (
                    <span
                      key={a}
                      className="text-xs px-2 py-0.5"
                      style={{
                        color: "var(--accent)",
                        border: "1px solid var(--border)",
                        borderRadius: "2px",
                        fontFamily: "var(--font-geist-mono), monospace",
                      }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Environment ── */}
      <div className="term-panel">
        <div className="term-panel-header">
          <span className="term-panel-title">ENVIRONMENT</span>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
          {[
            { label: "NODE_ENV", value: env.nodeEnv },
            { label: "NODE_VERSION", value: env.nodeVersion },
            { label: "CHECKED_AT", value: checkedAtFormatted },
            { label: "DB_LATENCY", value: `${db.latencyMs}ms` },
          ].map(({ label, value }) => (
            <div key={label} className="term-panel p-3">
              <p className="term-label mb-1">{label}</p>
              <p className="text-xs font-bold" style={{ color: "var(--foreground)", fontFamily: "var(--font-geist-mono), monospace" }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Link to data-health ── */}
      <div className="flex items-center justify-end">
        <Link
          href="/data-health"
          className="inline-flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-geist-mono), monospace" }}
        >
          {">"} FULL_DATA_INTEGRITY_REPORT
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </MobilePageShell>
  );
}
