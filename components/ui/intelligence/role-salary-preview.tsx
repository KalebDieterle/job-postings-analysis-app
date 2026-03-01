"use client";

import { useState } from "react";
import { DollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PredictionResult {
  predicted_salary: number;
  lower_bound: number;
  upper_bound: number;
  confidence: number;
}

function formatSalary(value: number) {
  return `$${(value / 1000).toFixed(0)}k`;
}

export function RoleSalaryPreview({ roleTitle }: { roleTitle: string }) {
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadInsight = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ml/salary/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: roleTitle,
        location: "",
        country: "us",
        experience_level: "Mid-Senior",
        work_type: "Full-time",
        remote_allowed: null,
        skills: [],
        industries: [],
        employee_count: null,
      }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || payload?.error || "Unable to load ML salary insight");
      }

      const payload = (await res.json()) as PredictionResult;
      setResult(payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load ML salary insight");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  if (!result) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold">ML Predicted Salary Range</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Load this model-powered estimate on demand to reduce compute usage.
        </p>
        {error ? <p className="text-sm text-destructive mb-3">{error}</p> : null}
        <Button size="sm" onClick={loadInsight} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            "Load ML Insight"
          )}
        </Button>
      </div>
    );
  }

  const { lower_bound, upper_bound, predicted_salary } = result;
  const range = upper_bound - lower_bound;
  const padding = range * 0.1;
  const min = lower_bound - padding;
  const max = upper_bound + padding;
  const totalRange = max - min;
  const lowerPct = ((lower_bound - min) / totalRange) * 100;
  const upperPct = ((upper_bound - min) / totalRange) * 100;
  const predictedPct = ((predicted_salary - min) / totalRange) * 100;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="h-4 w-4 text-emerald-600" />
        <h3 className="text-sm font-semibold">ML Predicted Salary Range</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {Math.round(result.confidence * 100)}% confidence
        </span>
      </div>
      {error ? <p className="text-sm text-destructive mb-2">{error}</p> : null}
      <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
        <span>{formatSalary(lower_bound)}</span>
        <span className="font-semibold text-foreground">{formatSalary(predicted_salary)}</span>
        <span>{formatSalary(upper_bound)}</span>
      </div>
      <div className="relative h-5 rounded-full bg-muted overflow-hidden">
        <div
          className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-emerald-400/60 via-emerald-500/80 to-emerald-400/60"
          style={{ left: `${lowerPct}%`, width: `${upperPct - lowerPct}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-emerald-700"
          style={{ left: `${predictedPct}%` }}
        />
      </div>
      <div className="mt-3">
        <Button size="sm" variant="outline" onClick={loadInsight} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            "Refresh Insight"
          )}
        </Button>
      </div>
    </div>
  );
}
