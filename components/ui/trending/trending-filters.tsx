"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const TIMEFRAMES = [
  { value: "7", label: "7 Days" },
  { value: "30", label: "30 Days" },
  { value: "90", label: "90 Days" },
];

const METRICS = [
  { value: "demand", label: "Demand Growth", icon: TrendingUp },
  { value: "salary", label: "Salary Growth", icon: DollarSign },
];

export function TrendingFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentTimeframe = searchParams.get("timeframe") || "30";
  const currentMetric = searchParams.get("sortBy") || "demand";

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/trends?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      {/* Timeframe Filter */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Timeframe</span>
        </div>
        <div className="flex gap-2">
          {TIMEFRAMES.map((timeframe) => (
            <Button
              key={timeframe.value}
              variant={
                currentTimeframe === timeframe.value ? "default" : "outline"
              }
              size="sm"
              onClick={() => updateFilter("timeframe", timeframe.value)}
              className={cn(
                "transition-all",
                currentTimeframe === timeframe.value && "shadow-md",
              )}
            >
              {timeframe.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="hidden sm:block h-12 w-px bg-slate-200 dark:bg-slate-800" />

      {/* Metric Filter */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span>Sort By</span>
        </div>
        <div className="flex gap-2">
          {METRICS.map((metric) => {
            const Icon = metric.icon;
            return (
              <Button
                key={metric.value}
                variant={currentMetric === metric.value ? "default" : "outline"}
                size="sm"
                onClick={() => updateFilter("sortBy", metric.value)}
                className={cn(
                  "transition-all gap-2",
                  currentMetric === metric.value && "shadow-md",
                )}
              >
                <Icon className="h-4 w-4" />
                {metric.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
