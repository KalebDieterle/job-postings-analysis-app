"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Sparkles,
  Plus,
  Zap,
  Award,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  gradient?: string;
  onClick?: () => void;
}

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  gradient,
  onClick,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200",
        onClick && "cursor-pointer hover:scale-105 hover:shadow-lg",
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {label}
            </p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {trend && (
              <div
                className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  trend.isPositive
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400",
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
          <div
            className={cn(
              "rounded-full p-3",
              gradient
                ? `bg-gradient-to-br ${gradient}`
                : "bg-slate-100 dark:bg-slate-800",
            )}
          >
            <Icon
              className={cn(
                "h-6 w-6",
                gradient ? "text-white" : "text-slate-600 dark:text-slate-400",
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AdvancedStatsPanelProps {
  stats: {
    totalSkills: number;
    avgDemand: number;
    avgSalary: number;
    topSkill: string;
    topSkillCount: number;
    newSkills: number;
    fastestGrowingSkill: string;
    fastestGrowthRate: number;
    highestPaidSkill: string;
    highestPaidSalary: number;
    mostVersatileSkill: string;
    mostVersatileRoleCount: number;
  };
}

export function AdvancedStatsPanel({ stats }: AdvancedStatsPanelProps) {
  const formatSalary = (value: number) => {
    return `$${(value / 1000).toFixed(0)}k`;
  };

  const primaryStats: StatCardProps[] = [
    {
      label: "Total Skills Tracked",
      value: stats.totalSkills.toLocaleString(),
      icon: Target,
      gradient: "from-blue-500 to-cyan-500",
      trend: {
        value: 5.2,
        isPositive: true,
      },
    },
    {
      label: "Average Market Demand",
      value: stats.avgDemand.toLocaleString(),
      icon: TrendingUp,
      gradient: "from-green-500 to-emerald-500",
      trend: {
        value: 12.5,
        isPositive: true,
      },
    },
    {
      label: "Average Salary",
      value: formatSalary(stats.avgSalary),
      icon: DollarSign,
      gradient: "from-purple-500 to-pink-500",
      trend: {
        value: 8.3,
        isPositive: true,
      },
    },
    {
      label: "Most In-Demand Skill",
      value: stats.topSkill,
      icon: Sparkles,
      gradient: "from-orange-500 to-red-500",
      trend: {
        value: 15.7,
        isPositive: true,
      },
    },
  ];

  const secondaryStats: StatCardProps[] = [
    {
      label: "Skills Added This Month",
      value: stats.newSkills,
      icon: Plus,
      gradient: "from-teal-500 to-cyan-500",
    },
    {
      label: "Fastest Growing Skill",
      value: stats.fastestGrowingSkill,
      icon: Zap,
      gradient: "from-yellow-500 to-orange-500",
      trend: {
        value: stats.fastestGrowthRate,
        isPositive: true,
      },
    },
    {
      label: "Highest Paid Skill",
      value: stats.highestPaidSkill,
      icon: Award,
      gradient: "from-indigo-500 to-purple-500",
    },
    {
      label: "Most Versatile Skill",
      value: stats.mostVersatileSkill,
      icon: Layers,
      gradient: "from-pink-500 to-rose-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Primary Stats */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
          Key Metrics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {primaryStats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>
      </div>

      {/* Secondary Stats */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
          Insights
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {secondaryStats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>
      </div>
    </div>
  );
}
