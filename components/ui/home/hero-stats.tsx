"use client";

import { useEffect, useState } from "react";

interface HeroStatsProps {
  data: {
    totalJobs: number;
    medianSalary?: number;
    avgSalary: number;
    salarySampleSize?: number;
    totalCompanies: number;
    totalSkills: number;
    monthlyGrowth: number;
  };
}

function AnimatedNumber({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1800;
    const steps = 50;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <>{count.toLocaleString()}</>;
}

interface MetricCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  meta: string;
  accent?: "orange" | "teal" | "green" | "warning";
}

function MetricCard({ label, value, prefix = "", suffix = "", meta, accent = "orange" }: MetricCardProps) {
  const accentColor =
    accent === "teal" ? "var(--accent)" :
    accent === "green" ? "var(--success)" :
    accent === "warning" ? "var(--warning)" :
    "var(--primary)";

  return (
    <div className="term-panel overflow-hidden">
      {/* Header bar */}
      <div className="term-panel-header">
        <span className="term-panel-title">{label}</span>
      </div>

      {/* Value */}
      <div className="px-4 py-4 space-y-1">
        <div
          className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight"
          style={{ color: accentColor, fontFamily: "var(--font-geist-mono), monospace" }}
        >
          {prefix}<AnimatedNumber value={value} />{suffix}
        </div>
        <p className="text-xs text-muted-foreground">[{">"} {meta}]</p>
      </div>
    </div>
  );
}

export function HeroStats({ data }: HeroStatsProps) {
  const {
    totalJobs,
    medianSalary,
    avgSalary,
    salarySampleSize,
    totalCompanies,
    totalSkills,
    monthlyGrowth,
  } = data;
  const salaryToDisplay = medianSalary ?? avgSalary;

  return (
    <div className="space-y-3">
      {/* System log line */}
      <p className="text-xs text-muted-foreground font-mono">
        <span style={{ color: "var(--accent)" }}>{">>>"}</span>{" "}
        SYSTEM_STATUS: LIVE_DATASET_CONNECTED
        {salarySampleSize ? ` · SALARY_SAMPLE: ${salarySampleSize.toLocaleString()}_POSTINGS` : ""}
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="TOTAL_POSTINGS"
          value={totalJobs}
          meta={`${monthlyGrowth > 0 ? "+" : ""}${monthlyGrowth}% MOM`}
          accent="orange"
        />
        <MetricCard
          label="MEDIAN_SALARY"
          value={salaryToDisplay}
          prefix="$"
          meta="+5% VS LAST QTR"
          accent="teal"
        />
        <MetricCard
          label="TOTAL_COMPANIES"
          value={totalCompanies}
          meta="+8% THIS MONTH"
          accent="green"
        />
        <MetricCard
          label="UNIQUE_SKILLS"
          value={totalSkills}
          meta="GROWING DEMAND"
          accent="warning"
        />
      </div>
    </div>
  );
}
