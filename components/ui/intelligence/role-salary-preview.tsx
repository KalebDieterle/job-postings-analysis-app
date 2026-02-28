"use client";

import { useEffect, useState } from "react";
import { DollarSign } from "lucide-react";

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

  useEffect(() => {
    fetch("/api/ml/salary/predict", {
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
    })
      .then((res) => (res.ok ? res.json() : null))
      .then(setResult)
      .catch(() => {});
  }, [roleTitle]);

  if (!result) return null;

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
    </div>
  );
}
