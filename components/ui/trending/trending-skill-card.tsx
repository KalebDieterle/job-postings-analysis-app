"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  DollarSign,
  Zap,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
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
}

export function TrendingSkillCard({
  name,
  currentCount,
  growthPercentage,
  salaryChange,
  currentSalary,
  trendStatus,
  category = "Technology",
}: TrendingSkillCardProps) {
  const colors = getCategoryColors(category);
  const isPositive = growthPercentage > 0;
  const formattedSalary =
    currentSalary > 0 ? `$${Math.round(currentSalary / 1000)}k` : "N/A";
  const formattedSalaryChange = Math.abs(Math.round(salaryChange / 1000));

  // Determine icon based on trend status
  const TrendIcon =
    trendStatus === "breakout" ? Zap : isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className="group relative overflow-hidden border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:shadow-xl transition-all duration-300">
      {/* Breakout Badge */}
      {trendStatus === "breakout" && (
        <div className="absolute top-3 right-3 z-10">
          <Badge
            variant="default"
            className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 gap-1 shadow-lg"
          >
            <Flame className="h-3 w-3" />
            Breakout
          </Badge>
        </div>
      )}

      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "h-12 w-12 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
              colors.bg,
            )}
          >
            <TrendIcon className={cn("h-6 w-6", colors.text)} />
          </div>

          {/* Growth Percentage Badge */}
          {trendStatus !== "breakout" && (
            <Badge
              variant="outline"
              className={cn(
                "gap-1 font-semibold border-2",
                isPositive
                  ? "border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30"
                  : "border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30",
              )}
            >
              {isPositive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(growthPercentage).toFixed(1)}%
            </Badge>
          )}
        </div>

        {/* Skill Name */}
        <div className="space-y-1">
          <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {name}
          </h3>
          <Badge variant="secondary" className="text-xs font-medium">
            {category}
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Current Demand */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Briefcase className="h-3 w-3" />
              <span>Demand</span>
            </div>
            <p className="text-lg font-bold">{currentCount.toLocaleString()}</p>
          </div>

          {/* Salary */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>Avg Salary</span>
            </div>
            <p className="text-lg font-bold">{formattedSalary}</p>
          </div>
        </div>

        {/* Salary Change Indicator */}
        {formattedSalaryChange > 0 && (
          <div
            className={cn(
              "flex items-center justify-between p-2 rounded-lg text-sm font-medium",
              salaryChange > 0
                ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400",
            )}
          >
            <span className="text-xs">Salary Change</span>
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

        {/* Mini Sparkline Visual (Growth Indicator Bar) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Growth Momentum</span>
            <span className="font-semibold">
              {Math.abs(growthPercentage).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isPositive
                  ? "bg-gradient-to-r from-green-400 to-emerald-500"
                  : "bg-gradient-to-r from-red-400 to-orange-500",
              )}
              style={{
                width: `${Math.min(Math.abs(growthPercentage), 100)}%`,
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
