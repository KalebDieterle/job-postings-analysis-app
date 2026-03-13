/**
 * Admin health check aggregator.
 * Called directly by the admin server component and re-exported by the API route.
 * Uses Promise.allSettled so one failing check never blocks others.
 */

import { getDatabaseStats } from "@/db/queries";
import { getAllUsage } from "@/lib/adzuna-usage-tracker";
import { getMlServiceUrl } from "@/lib/ml/proxy-utils";

// ── Adzuna hard-coded quota limits ──────────────────────────────────────────
const ADZUNA_LIMITS = { daily: 250, weekly: 1000, monthly: 2500 } as const;

// ── Type definitions ─────────────────────────────────────────────────────────

export interface DbHealth {
  status: "ok" | "error";
  latencyMs: number;
  stats: {
    total_postings: number;
    total_companies: number;
    total_skills: number;
    total_job_skills: number;
  } | null;
  error?: string;
}

export interface MlHealth {
  status: "ok" | "degraded" | "error";
  latencyMs: number;
  health: {
    status: string;
    models_loaded: boolean;
    loaded_artifacts: string[];
    version: string;
  } | null;
  error?: string;
}

export interface AdzunaQuotaPeriod {
  used: number;
  limit: number;
  remaining: number;
  pct: number;
}

export interface AdzunaHealth {
  status: "ok" | "warning" | "critical" | "error";
  usage: {
    daily: AdzunaQuotaPeriod;
    weekly: AdzunaQuotaPeriod;
    monthly: AdzunaQuotaPeriod;
  } | null;
  error?: string;
}

export interface EnvInfo {
  nodeEnv: string;
  nodeVersion: string;
  serverTime: string;
}

export interface AdminHealthResult {
  db: DbHealth;
  ml: MlHealth;
  adzuna: AdzunaHealth;
  env: EnvInfo;
  checkedAt: string;
}

// ── Individual checks ─────────────────────────────────────────────────────────

async function checkDatabase(): Promise<DbHealth> {
  const t0 = performance.now();
  try {
    const raw = await getDatabaseStats();
    const latencyMs = Math.round(performance.now() - t0);
    return {
      status: "ok",
      latencyMs,
      stats: {
        total_postings: Number(raw.total_postings),
        total_companies: Number(raw.total_companies),
        total_skills: Number(raw.total_skills),
        total_job_skills: Number(raw.total_job_skills),
      },
    };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Math.round(performance.now() - t0),
      stats: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkMlService(): Promise<MlHealth> {
  const t0 = performance.now();
  try {
    const url = getMlServiceUrl() + "/api/v1/health";
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const latencyMs = Math.round(performance.now() - t0);

    if (!res.ok) {
      return {
        status: "error",
        latencyMs,
        health: null,
        error: `HTTP ${res.status} ${res.statusText}`,
      };
    }

    const data = await res.json();
    const modelsLoaded = Boolean(data.models_loaded);
    return {
      status: modelsLoaded ? "ok" : "degraded",
      latencyMs,
      health: {
        status: data.status ?? "unknown",
        models_loaded: modelsLoaded,
        loaded_artifacts: Array.isArray(data.loaded_artifacts) ? data.loaded_artifacts : [],
        version: data.version ?? "unknown",
      },
    };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Math.round(performance.now() - t0),
      health: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function quotaStatus(pct: number): "ok" | "warning" | "critical" {
  if (pct >= 95) return "critical";
  if (pct >= 80) return "warning";
  return "ok";
}

async function checkAdzunaQuota(): Promise<AdzunaHealth> {
  try {
    const raw = await getAllUsage();
    const periods = (["daily", "weekly", "monthly"] as const).map((p) => {
      const used = raw[p] ?? 0;
      const limit = ADZUNA_LIMITS[p];
      const remaining = Math.max(0, limit - used);
      const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
      return { p, used, limit, remaining, pct };
    });

    const worstPct = Math.max(...periods.map((x) => x.pct));
    const overallStatus = quotaStatus(worstPct);

    return {
      status: overallStatus,
      usage: {
        daily: periods[0],
        weekly: periods[1],
        monthly: periods[2],
      },
    };
  } catch (err) {
    return {
      status: "error",
      usage: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Main aggregator ───────────────────────────────────────────────────────────

export async function getAdminHealth(): Promise<AdminHealthResult> {
  const [dbResult, mlResult, adzunaResult] = await Promise.allSettled([
    checkDatabase(),
    checkMlService(),
    checkAdzunaQuota(),
  ]);

  const db: DbHealth =
    dbResult.status === "fulfilled"
      ? dbResult.value
      : { status: "error", latencyMs: 0, stats: null, error: String(dbResult.reason) };

  const ml: MlHealth =
    mlResult.status === "fulfilled"
      ? mlResult.value
      : { status: "error", latencyMs: 0, health: null, error: String(mlResult.reason) };

  const adzuna: AdzunaHealth =
    adzunaResult.status === "fulfilled"
      ? adzunaResult.value
      : { status: "error", usage: null, error: String(adzunaResult.reason) };

  const env: EnvInfo = {
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    nodeVersion: process.version,
    serverTime: new Date().toISOString(),
  };

  return { db, ml, adzuna, env, checkedAt: new Date().toISOString() };
}
