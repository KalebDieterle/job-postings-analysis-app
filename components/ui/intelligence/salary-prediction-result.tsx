"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PredictionResult {
  predicted_salary: number;
  lower_bound: number;
  upper_bound: number;
  confidence: number;
  factors?: { feature: string; importance: number }[];
  adjustments?: { source: string; delta: number }[];
}

function formatSalary(value: number) {
  return `$${(value / 1000).toFixed(0)}k`;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

function ConfidenceBar({
  lowerBound,
  upperBound,
  predictedSalary,
}: {
  lowerBound: number | null;
  upperBound: number | null;
  predictedSalary: number | null;
}) {
  if (
    lowerBound === null ||
    upperBound === null ||
    predictedSalary === null ||
    upperBound <= lowerBound
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        Confidence interval unavailable for this prediction.
      </p>
    );
  }

  const range = upperBound - lowerBound;
  const padding = range * 0.1;
  const min = lowerBound - padding;
  const max = upperBound + padding;
  const totalRange = max - min;

  if (totalRange <= 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Confidence interval unavailable for this prediction.
      </p>
    );
  }

  const lowerPct = ((lowerBound - min) / totalRange) * 100;
  const upperPct = ((upperBound - min) / totalRange) * 100;
  const predictedPct = ((predictedSalary - min) / totalRange) * 100;

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>P10: {formatSalary(lowerBound)}</span>
        <span className="text-sm font-semibold text-foreground">
          {formatSalary(predictedSalary)}
        </span>
        <span>P90: {formatSalary(upperBound)}</span>
      </div>
      <div className="relative h-8 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute bottom-0 top-0 rounded-full bg-gradient-to-r from-sky-400/60 via-sky-500/80 to-sky-400/60"
          style={{
            left: `${lowerPct}%`,
            width: `${upperPct - lowerPct}%`,
          }}
        />
        <div
          className="absolute bottom-0 top-0 w-1 bg-sky-600 shadow-md"
          style={{ left: `${predictedPct}%` }}
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-sky-500/70" />
        <span>P10-P90 confidence interval</span>
        <div className="ml-2 h-3 w-0.5 bg-sky-600" />
        <span>Predicted median</span>
      </div>
    </div>
  );
}

function FactorsChart({
  factors,
}: {
  factors: { feature: string; importance: number }[];
}) {
  const data = factors.map((factor) => ({
    name: factor.feature
      .replace("skill_", "")
      .replace("ind_", "")
      .replace(/_/g, " "),
    importance: Math.round(factor.importance * 100),
  }));

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={75} />
        <Tooltip
          formatter={(value: number) => [`${value}%`, "Importance"]}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--popover)",
            color: "var(--popover-foreground)",
          }}
        />
        <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SalaryPredictionResult({
  result,
  loading,
}: {
  result: PredictionResult | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prediction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="flex items-center justify-center">
        <CardContent className="py-16 text-center text-muted-foreground">
          <p className="text-lg font-medium">No prediction yet</p>
          <p className="mt-1 text-sm">Fill in the job parameters and click Predict</p>
        </CardContent>
      </Card>
    );
  }

  const predictedSalary = toFiniteNumber(result.predicted_salary);
  const lowerBound = toFiniteNumber(result.lower_bound);
  const upperBound = toFiniteNumber(result.upper_bound);
  const confidence = toFiniteNumber(result.confidence);

  const confidenceLabel =
    confidence === null
      ? "Confidence unavailable"
      : `${Math.round(Math.max(0, Math.min(1, confidence)) * 100)}% confidence`;

  const rangeLabel =
    lowerBound !== null && upperBound !== null && upperBound >= lowerBound
      ? `Range: ${formatSalary(lowerBound)} - ${formatSalary(upperBound)}`
      : "Range unavailable";

  const safeAdjustments = Array.isArray(result.adjustments)
    ? result.adjustments.filter(
        (adjustment): adjustment is { source: string; delta: number } =>
          Boolean(adjustment) &&
          typeof adjustment.source === "string" &&
          typeof adjustment.delta === "number" &&
          Number.isFinite(adjustment.delta),
      )
    : [];

  const safeFactors = Array.isArray(result.factors)
    ? result.factors.filter(
        (factor): factor is { feature: string; importance: number } =>
          Boolean(factor) &&
          typeof factor.feature === "string" &&
          typeof factor.importance === "number" &&
          Number.isFinite(factor.importance),
      )
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Predicted Salary</CardTitle>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            {confidenceLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-4xl font-bold tracking-tight text-sky-600">
            {predictedSalary === null ? "N/A" : formatSalary(predictedSalary)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{rangeLabel}</p>
        </div>

        <ConfidenceBar
          lowerBound={lowerBound}
          upperBound={upperBound}
          predictedSalary={predictedSalary}
        />

        {safeAdjustments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Applied Adjustments</h4>
            <div className="grid gap-2">
              {safeAdjustments.map((adjustment, index) => {
                const sourceLabel =
                  adjustment.source === "skills"
                    ? "Skill profile"
                    : adjustment.source === "company_scale"
                      ? "Company scale"
                      : adjustment.source;
                const delta =
                  adjustment.delta >= 0
                    ? `+$${adjustment.delta.toLocaleString()}`
                    : `-$${Math.abs(adjustment.delta).toLocaleString()}`;

                return (
                  <div
                    key={`${adjustment.source}-${adjustment.delta}-${index}`}
                    className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">{sourceLabel}</span>
                    <span className={adjustment.delta >= 0 ? "text-emerald-500" : "text-amber-500"}>
                      {delta}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {safeFactors.length > 0 ? (
          <div>
            <h4 className="mb-3 text-sm font-medium">Top Driving Factors</h4>
            <FactorsChart factors={safeFactors} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No factor breakdown available for this prediction.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

