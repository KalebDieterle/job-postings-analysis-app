"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatGauge } from "@/components/ui/stat-gauge";
import { Activity } from "lucide-react";
import { calculateMarketHealthScore } from "@/lib/location-analytics";

interface MarketHealthCardProps {
  stats: {
    totalJobs: number | string;
    totalCompanies: number | string;
    avgMinSalary?: number | string | null;
    avgMedSalary?: number | string | null;
    avgMaxSalary?: number | string | null;
  };
}

export function MarketHealthCard({ stats }: MarketHealthCardProps) {
  const healthScore = calculateMarketHealthScore(stats);

  const getHealthStatus = (score: number) => {
    if (score >= 75) return { label: "Excellent", color: "text-green-500" };
    if (score >= 50) return { label: "Good", color: "text-blue-500" };
    if (score >= 25) return { label: "Fair", color: "text-yellow-500" };
    return { label: "Needs Improvement", color: "text-red-500" };
  };

  const health = getHealthStatus(healthScore);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <CardTitle>Market Health</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <StatGauge value={healthScore} size={140} />
        <p className={`mt-4 text-lg font-semibold ${health.color}`}>
          {health.label}
        </p>
        <p className="text-sm text-muted-foreground text-center mt-2">
          Based on job opportunities, salaries, and market activity
        </p>
      </CardContent>
    </Card>
  );
}
