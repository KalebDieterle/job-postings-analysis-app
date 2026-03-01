"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Briefcase, DollarSign, Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getCategoryColors } from "@/lib/skill-helpers";

interface SkillCardProps {
  name: string;
  count: number;
  medianSalary: number;
  category?: string;
  description?: string;
  trend?: number;
  isFavorite?: boolean;
}

export function SkillCard({
  name,
  count,
  medianSalary,
  category = "Tools & Platforms",
  description,
  trend,
  isFavorite = false,
}: SkillCardProps) {
  const [favorite, setFavorite] = useState(isFavorite);

  const demandPercent = Math.min((count / 5000) * 100, 100);
  const formattedSalary =
    medianSalary > 0 ? `$${Math.round(medianSalary / 1000)}k` : "N/A";

  const colors = getCategoryColors(category);

  return (
    <Card className="group relative overflow-hidden border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:shadow-xl transition-all duration-300">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "h-12 w-12 rounded-lg flex items-center justify-center",
              colors.bg,
            )}
          >
            <TrendingUp className={cn("h-6 w-6", colors.text)} />
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              setFavorite(!favorite);
            }}
            className="transition-colors"
          >
            <Star
              className={cn(
                "h-5 w-5",
                favorite
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-slate-300 dark:text-slate-600 group-hover:text-primary",
              )}
            />
          </button>
        </div>

        {/* Title & Description */}
        <div>
          <h5 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
            {name}
          </h5>
          {description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          {/* Demand */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 uppercase font-bold tracking-tight flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              Demand
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {count.toLocaleString()} jobs
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
            <div
              className={cn("h-1.5 rounded-full transition-all", colors.bar)}
              style={{ width: `${demandPercent}%` }}
            />
          </div>

          {/* Salary */}
          <div className="flex justify-between items-center pt-1">
            <span className="text-xs text-slate-400 uppercase font-bold tracking-tight flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Median Salary
            </span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {formattedSalary}
            </span>
          </div>

          {/* Trend (if available) */}
          {trend !== undefined && (
            <div className="flex items-center justify-between pt-2">
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs font-bold",
                  trend > 0
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400",
                )}
              >
                {trend > 0 ? "+" : ""}
                {trend}%
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
