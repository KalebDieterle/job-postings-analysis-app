"use client";

import * as React from "react";
import { useQueryStates } from "nuqs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { skillsSearchParamsParser } from "@/lib/skills-search-params";
import { useTransition } from "react";
import {
  BarChart3,
  Cloud,
  DollarSign,
  Flame,
  Laptop,
  Rocket,
  Shield,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

interface QuickFilterCounts {
  trending: number;
  highPaying: number;
  highDemand: number;
  emerging: number;
  cloudDevOps: number;
  fullStack: number;
  dataAnalytics: number;
  security: number;
}

export function SmartQuickFilters() {
  const [, setSearchParams] = useQueryStates(
    skillsSearchParamsParser,
    {
      shallow: false,
    },
  );
  const [isPending, startTransition] = useTransition();
  const [activeFilter, setActiveFilter] = React.useState<string | null>(null);

  // Mock counts - in production, these would come from an API call
  const counts: QuickFilterCounts = {
    trending: 47,
    highPaying: 156,
    highDemand: 89,
    emerging: 32,
    cloudDevOps: 78,
    fullStack: 52,
    dataAnalytics: 94,
    security: 41,
  };

  const handleQuickFilter = (filterKey: string) => {
    startTransition(() => {
      if (activeFilter === filterKey) {
        // Clear the filter
        setActiveFilter(null);
        setSearchParams({
          category: [],
          salaryMin: 40000,
          demandMin: 0,
          page: 1,
        });
      } else {
        // Apply the filter
        setActiveFilter(filterKey);

        switch (filterKey) {
          case "trending":
            // This would ideally trigger a special query
            setSearchParams({ sort: "growth", page: 1 });
            break;
          case "highPaying":
            setSearchParams({ salaryMin: 120000, page: 1 });
            break;
          case "highDemand":
            setSearchParams({ demandMin: 1000, page: 1 });
            break;
          case "emerging":
            setSearchParams({ category: ["AI/ML & Data Science"], page: 1 });
            break;
          case "cloudDevOps":
            setSearchParams({ category: ["DevOps & Cloud"], page: 1 });
            break;
          case "fullStack":
            setSearchParams({
              category: ["Frameworks & Libraries", "Programming Languages"],
              page: 1,
            });
            break;
          case "dataAnalytics":
            setSearchParams({
              category: ["Databases & Data", "AI/ML & Data Science"],
              page: 1,
            });
            break;
          case "security":
            setSearchParams({ q: "security", page: 1 });
            break;
        }
      }
    });
  };

  const quickFilterButtons = [
    {
      key: "trending",
      label: "Trending Now",
      count: counts.trending,
      gradient: "from-orange-500 to-red-500",
      icon: Flame,
    },
    {
      key: "highPaying",
      label: "High Paying",
      count: counts.highPaying,
      gradient: "from-green-500 to-emerald-500",
      icon: DollarSign,
    },
    {
      key: "highDemand",
      label: "In High Demand",
      count: counts.highDemand,
      gradient: "from-blue-500 to-cyan-500",
      icon: Rocket,
    },
    {
      key: "emerging",
      label: "Emerging Tech",
      count: counts.emerging,
      gradient: "from-purple-500 to-pink-500",
      icon: Sparkles,
    },
    {
      key: "cloudDevOps",
      label: "Cloud & DevOps",
      count: counts.cloudDevOps,
      gradient: "from-sky-500 to-blue-500",
      icon: Cloud,
    },
    {
      key: "fullStack",
      label: "Full Stack",
      count: counts.fullStack,
      gradient: "from-indigo-500 to-purple-500",
      icon: Laptop,
    },
    {
      key: "dataAnalytics",
      label: "Data & Analytics",
      count: counts.dataAnalytics,
      gradient: "from-teal-500 to-cyan-500",
      icon: BarChart3,
    },
    {
      key: "security",
      label: "Security",
      count: counts.security,
      gradient: "from-red-500 to-rose-500",
      icon: Shield,
    },
  ] satisfies Array<{
    key:
      | "trending"
      | "highPaying"
      | "highDemand"
      | "emerging"
      | "cloudDevOps"
      | "fullStack"
      | "dataAnalytics"
      | "security";
    label: string;
    count: number;
    gradient: string;
    icon: LucideIcon;
  }>;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        Quick Filters
      </h4>
      <div className="flex flex-wrap gap-2">
        {quickFilterButtons.map((filter) => {
          const Icon = filter.icon;
          return (
          <button
            key={filter.key}
            onClick={() => handleQuickFilter(filter.key)}
            disabled={isPending}
            className={cn(
              "group relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
              "hover:scale-105 active:scale-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
              activeFilter === filter.key
                ? "bg-gradient-to-r text-white shadow-lg"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
              activeFilter === filter.key && filter.gradient,
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{filter.label}</span>
            <Badge
              variant={activeFilter === filter.key ? "secondary" : "outline"}
              className={cn(
                "rounded-full px-2 py-0.5 text-xs",
                activeFilter === filter.key
                  ? "bg-white/20 text-white border-white/30"
                  : "",
              )}
            >
              {filter.count}
            </Badge>
          </button>
          );
        })}
      </div>
    </div>
  );
}
