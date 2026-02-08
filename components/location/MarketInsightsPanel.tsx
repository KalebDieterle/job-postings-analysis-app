"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, DollarSign, Info, ChevronDown } from "lucide-react";
import { calculateRemotePercentage } from "@/lib/location-analytics";
import { formatSalary } from "@/lib/location-utils";
import { useState } from "react";

interface MarketInsightsPanelProps {
  stats: {
    totalJobs: number | string;
    totalCompanies: number | string;
    avgMedSalary?: number | string | null;
  };
  topSkills: Array<{ skillName: string; count: number | string }>;
  recentJobs: Array<{ remoteAllowed?: boolean | null }>;
}

export function MarketInsightsPanel({
  stats,
  topSkills,
  recentJobs,
}: MarketInsightsPanelProps) {
  const [openSections, setOpenSections] = useState<string[]>(["trends"]);
  const remotePercentage = calculateRemotePercentage(recentJobs);
  const topSkill = topSkills[0]?.skillName || "N/A";
  const avgSalary = Number(stats.avgMedSalary || 0);
  const nationalAvg = 75000; // Placeholder for comparison
  const salaryDiff =
    avgSalary > 0 ? ((avgSalary - nationalAvg) / nationalAvg) * 100 : 0;

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section],
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-500" />
          <CardTitle>Market Insights</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Market Trends Section */}
        <Collapsible
          open={openSections.includes("trends")}
          onOpenChange={() => toggleSection("trends")}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted rounded-lg transition-colors">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="font-semibold">Market Trends</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                openSections.includes("trends") ? "rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 pl-9 space-y-2">
            <div className="text-sm">
              <p className="text-muted-foreground">
                •{" "}
                <span className="font-medium text-foreground">High demand</span>{" "}
                for {topSkill} professionals
              </p>
              <p className="text-muted-foreground">
                •{" "}
                <span className="font-medium text-foreground">
                  {remotePercentage}%
                </span>{" "}
                of jobs offer remote work options
              </p>
              {salaryDiff > 0 && (
                <p className="text-muted-foreground">
                  • Average salary{" "}
                  <span className="font-medium text-green-600">
                    {salaryDiff.toFixed(1)}% above
                  </span>{" "}
                  national average
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Hot Skills Section */}
        <Collapsible
          open={openSections.includes("skills")}
          onOpenChange={() => toggleSection("skills")}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted rounded-lg transition-colors">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" />
              <span className="font-semibold">Hot Skills</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                openSections.includes("skills") ? "rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 pl-9">
            <div className="flex flex-wrap gap-2">
              {topSkills.slice(0, 8).map((skill) => (
                <Badge
                  key={skill.skillName}
                  variant="secondary"
                  className="hover:bg-primary/20 transition-colors"
                >
                  {skill.skillName}
                </Badge>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Quick Facts Section */}
        <Collapsible
          open={openSections.includes("facts")}
          onOpenChange={() => toggleSection("facts")}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted rounded-lg transition-colors">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="font-semibold">Quick Facts</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                openSections.includes("facts") ? "rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 pl-9 space-y-2">
            <div className="text-sm space-y-1">
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Total Opportunities:
                </span>
                <span className="font-medium">
                  {Number(stats.totalJobs).toLocaleString()}
                </span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Active Companies:</span>
                <span className="font-medium">
                  {Number(stats.totalCompanies).toLocaleString()}
                </span>
              </p>
              {avgSalary > 0 && (
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Median Salary:</span>
                  <span className="font-medium text-green-600">
                    {formatSalary(avgSalary)}
                  </span>
                </p>
              )}
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Remote Opportunities:
                </span>
                <span className="font-medium">{remotePercentage}%</span>
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
