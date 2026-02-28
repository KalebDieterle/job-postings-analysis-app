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
  factors: { feature: string; importance: number }[];
  adjustments?: { source: string; delta: number }[];
}

function formatSalary(value: number) {
  return `$${(value / 1000).toFixed(0)}k`;
}

function ConfidenceBar({ result }: { result: PredictionResult }) {
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
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>P10: {formatSalary(lower_bound)}</span>
        <span className="font-semibold text-foreground text-sm">
          {formatSalary(predicted_salary)}
        </span>
        <span>P90: {formatSalary(upper_bound)}</span>
      </div>
      <div className="relative h-8 rounded-full bg-muted overflow-hidden">
        {/* P10-P90 range */}
        <div
          className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-sky-400/60 via-sky-500/80 to-sky-400/60"
          style={{
            left: `${lowerPct}%`,
            width: `${upperPct - lowerPct}%`,
          }}
        />
        {/* Predicted value marker */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-sky-600 shadow-md"
          style={{ left: `${predictedPct}%` }}
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-sky-500/70" />
        <span>P10–P90 confidence interval</span>
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
  const data = factors.map((f) => ({
    name: f.feature
      .replace("skill_", "")
      .replace("ind_", "")
      .replace("_", " "),
    importance: Math.round(f.importance * 100),
  }));

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12 }}
          width={75}
        />
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
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
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
        <CardContent className="text-center text-muted-foreground py-16">
          <p className="text-lg font-medium">No prediction yet</p>
          <p className="text-sm mt-1">
            Fill in the job parameters and click Predict
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Predicted Salary</CardTitle>
          <span className="text-xs text-muted-foreground rounded-full bg-muted px-2.5 py-1">
            {Math.round(result.confidence * 100)}% confidence
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-4xl font-bold tracking-tight text-sky-600">
            {formatSalary(result.predicted_salary)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Range: {formatSalary(result.lower_bound)} –{" "}
            {formatSalary(result.upper_bound)}
          </p>
        </div>

        <ConfidenceBar result={result} />

        {result.adjustments && result.adjustments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Applied Adjustments</h4>
            <div className="grid gap-2">
              {result.adjustments.map((adj) => {
                const sourceLabel =
                  adj.source === "skills"
                    ? "Skill profile"
                    : adj.source === "company_scale"
                      ? "Company scale"
                      : adj.source;
                const delta = adj.delta >= 0 ? `+$${adj.delta.toLocaleString()}` : `-$${Math.abs(adj.delta).toLocaleString()}`;

                return (
                  <div
                    key={`${adj.source}-${adj.delta}`}
                    className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">{sourceLabel}</span>
                    <span className={adj.delta >= 0 ? "text-emerald-500" : "text-amber-500"}>
                      {delta}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {result.factors.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Top Driving Factors</h4>
            <FactorsChart factors={result.factors} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
