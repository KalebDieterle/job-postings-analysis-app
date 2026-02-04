"use client";

import { Badge } from "@/components/ui/badge";
import { TrendingChart } from "./trending-chart";
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  DollarSign,
  Zap,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryColors } from "@/lib/skill-helpers";

interface TrendingSkillCardProps {
  name: string;
  currentCount: number;
  growthPercentage: number;
  salaryChange: number;
  currentSalary: number;
  trendStatus: "rising" | "falling" | "breakout";
  category?: string;
  /** Optional sparkline data points */
  chartData?: number[];
}

export function TrendingSkillCard({
  name,
  currentCount,
  growthPercentage,
  salaryChange,
  currentSalary,
  trendStatus,
  category = "Technology",
  chartData,
}: TrendingSkillCardProps) {
  const colors = getCategoryColors(category);
  const isPositive = growthPercentage > 0;
  const formattedSalary =
    currentSalary > 0 ? `$${Math.round(currentSalary / 1000)}k` : "N/A";
  const formattedSalaryChange = Math.abs(Math.round(salaryChange / 1000));

  // Determine icon based on trend status
  const TrendIcon =
    trendStatus === "breakout" ? Zap : isPositive ? TrendingUp : TrendingDown;

  const trendBadgeClass =
    trendStatus === "breakout"
      ? "trend-badge-breakout"
      : isPositive
        ? "trend-badge-up"
        : "trend-badge-down";

  return (
    <div className="glass-card group relative overflow-hidden p-5 space-y-4 transition-all duration-300 hover:scale-[1.02]">
      {/* Background glow effect for breakout */}
      {trendStatus === "breakout" && (
        <div className="absolute inset-0 bg-linear-to-br from-orange-500/10 to-red-500/10 pointer-events-none" />
      )}

      {/* Breakout Badge */}
      {trendStatus === "breakout" && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-linear-to-r from-orange-500 to-red-500 text-white border-0 gap-1 shadow-lg glow-warning">
            <Flame className="h-3 w-3" />
            Breakout
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between relative z-10">
        <div
          className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 glass-subtle",
            colors.bg,
          )}
        >
          <TrendIcon className={cn("h-6 w-6", colors.text)} />
        </div>

        {/* Growth Percentage Badge */}
        {trendStatus !== "breakout" && (
          <span className={cn("gap-1 font-semibold", trendBadgeClass)}>
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(growthPercentage).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Skill Name */}
      <div className="space-y-1.5 relative z-10">
        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
          {name}
        </h3>
        <Badge
          variant="secondary"
          className="text-xs font-medium glass-subtle border-0"
        >
          {category}
        </Badge>
      </div>

      {/* Sparkline Chart */}
      <div className="relative z-10 -mx-1">
        <TrendingChart
          growthPercentage={growthPercentage}
          dataPoints={chartData}
          height={36}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 relative z-10">
        {/* Current Demand */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Briefcase className="h-3 w-3" />
            <span>Demand</span>
          </div>
          <p className="text-base font-bold">{currentCount.toLocaleString()}</p>
        </div>

        {/* Salary */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            <span>Avg Salary</span>
          </div>
          <p className="text-base font-bold">{formattedSalary}</p>
        </div>
      </div>

      {/* Salary Change Indicator */}
      {formattedSalaryChange > 0 && (
        <div
          className={cn(
            "flex items-center justify-between p-2.5 rounded-lg text-sm font-medium relative z-10",
            salaryChange > 0
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border border-rose-500/20",
          )}
        >
          <span className="text-xs opacity-80">Salary Change</span>
          <span className="font-bold flex items-center gap-1">
            {salaryChange > 0 ? "+" : "-"}${formattedSalaryChange}k
            {salaryChange > 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
          </span>
        </div>
      )}
    </div>
  );
}
