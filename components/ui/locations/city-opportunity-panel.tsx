"use client";

import Link from "next/link";
import { BriefcaseBusiness, DollarSign, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LocationItem = {
  city?: string;
  state?: string;
  country?: string;
  jobCount: number;
  avgSalary?: number;
  slug?: string;
};

interface CityOpportunityPanelProps {
  data: LocationItem[];
}

const NON_CITY_LABELS = new Set([
  "us",
  "usa",
  "u.s.",
  "u.s.a.",
  "united states",
  "united states of america",
]);

function formatLocation(item: LocationItem) {
  return [item.city, item.state].filter(Boolean).join(", ") || "Unknown";
}

function formatCompactSalary(value?: number) {
  if (!value || value <= 0) return "N/A";
  return `$${(value / 1000).toFixed(0)}k`;
}

function isNonCityRecord(item: LocationItem) {
  const city = (item.city || "").trim().toLowerCase();
  const country = (item.country || "").trim().toLowerCase();
  if (!city) return true;
  if (NON_CITY_LABELS.has(city)) return true;
  if (country && city === country) return true;
  return false;
}

export function CityOpportunityPanel({ data }: CityOpportunityPanelProps) {
  const cityData = data.filter((item) => !isNonCityRecord(item));

  const sortedByJobs = [...cityData].sort(
    (a, b) => (b.jobCount || 0) - (a.jobCount || 0),
  );
  const salaryCandidates = cityData.filter((item) => Number(item.avgSalary || 0) > 0);
  const sortedBySalary = [...salaryCandidates].sort(
    (a, b) => Number(b.avgSalary || 0) - Number(a.avgSalary || 0),
  );

  const topByJobs = sortedByJobs[0];
  const topBySalary = sortedBySalary[0];

  const maxJobs = Math.max(...cityData.map((item) => Number(item.jobCount || 0)), 1);
  const maxSalary = Math.max(...salaryCandidates.map((item) => Number(item.avgSalary || 0)), 1);

  const scoredMarkets = cityData
    .map((item) => {
      const jobsNorm = Number(item.jobCount || 0) / maxJobs;
      const salaryNorm = Number(item.avgSalary || 0) / maxSalary;
      const score = Math.round((jobsNorm * 0.65 + salaryNorm * 0.35) * 100);
      return { ...item, score };
    })
    .sort((a, b) => b.score - a.score);

  const bestBalanced = scoredMarkets[0];
  const topScored = scoredMarkets.slice(0, 5);

  if (cityData.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-4">
          <CardTitle>City Opportunity Mix</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No city-level data available for the current filters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle>City Opportunity Mix</CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Demand + compensation view of top markets
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Most Jobs</p>
            <p className="font-semibold text-sm truncate">{formatLocation(topByJobs)}</p>
            <p className="text-lg font-bold text-blue-400 mt-1 tabular-nums">
              {(topByJobs?.jobCount || 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Top Median Salary</p>
            <p className="font-semibold text-sm truncate">{formatLocation(topBySalary)}</p>
            <p className="text-lg font-bold text-emerald-400 mt-1 tabular-nums">
              {formatCompactSalary(topBySalary?.avgSalary)}
            </p>
          </div>
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Best Balanced</p>
            <p className="font-semibold text-sm truncate">{formatLocation(bestBalanced)}</p>
            <p className="text-lg font-bold text-violet-400 mt-1 tabular-nums">
              {bestBalanced?.score || 0}/100
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {topScored.map((item, idx) => {
            const content = (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">
                    {idx + 1}. {formatLocation(item)}
                  </p>
                  <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    Score {item.score}
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-200/70 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 transition-all duration-700"
                    style={{ width: `${Math.max(8, Math.min(100, item.score))}%` }}
                  />
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <BriefcaseBusiness className="w-3.5 h-3.5" />
                    {(item.jobCount || 0).toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <DollarSign className="w-3.5 h-3.5" />
                    {formatCompactSalary(item.avgSalary)}
                  </span>
                </div>
              </div>
            );

            return item.slug ? (
              <Link key={`${item.slug}-${idx}`} href={`/locations/${item.slug}`} className="block">
                {content}
              </Link>
            ) : (
              <div key={`${formatLocation(item)}-${idx}`}>{content}</div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
