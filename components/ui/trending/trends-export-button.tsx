"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type ComparisonMode = "contiguous" | "fallback" | "none";

interface ComparisonWindow {
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
}

interface ExportableTrendSkill {
  name: string;
  category: string;
  currentCount: number;
  previousCount: number;
  currentSalary: number;
  previousSalary: number;
  growthPercentage: number;
  salaryChange: number;
  trendStatus: string;
  comparisonMode: ComparisonMode;
}

interface TrendsExportButtonProps {
  data: ExportableTrendSkill[];
  timeframe: number;
  sortBy: "demand" | "salary";
  comparisonMode: ComparisonMode;
  comparisonWindow?: ComparisonWindow;
  dataAsOf?: string;
}

function escapeCsvValue(value: string | number): string {
  const raw = String(value);
  const escaped = raw.replace(/"/g, "\"\"");
  return `"${escaped}"`;
}

function formatSalary(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "N/A";
  return `$${Math.round(value).toLocaleString()}`;
}

function formatSalaryDelta(value: number): string {
  if (!Number.isFinite(value)) return "N/A";
  if (value === 0) return "$0";
  if (value < 0) {
    return `-$${Math.round(Math.abs(value)).toLocaleString()}`;
  }
  return `$${Math.round(value).toLocaleString()}`;
}

export function TrendsExportButton({
  data,
  timeframe,
  sortBy,
  comparisonMode,
  comparisonWindow,
  dataAsOf,
}: TrendsExportButtonProps) {
  const { toast } = useToast();

  const exportToCsv = () => {
    if (data.length === 0) {
      toast({
        title: "Nothing to export",
        description: "No trend rows are available for this filter set.",
        variant: "destructive",
      });
      return;
    }

    try {
      const generatedAt = new Date().toISOString();
      const metadataRows: Array<[string, string | number]> = [
        ["Generated At (UTC)", generatedAt],
        ["Timeframe (days)", timeframe],
        ["Sort By", sortBy],
        ["Comparison Mode", comparisonMode],
        ["Data As Of", dataAsOf || "N/A"],
      ];

      if (comparisonWindow) {
        metadataRows.push(
          ["Current Window Start", comparisonWindow.currentStart],
          ["Current Window End", comparisonWindow.currentEnd],
          ["Previous Window Start", comparisonWindow.previousStart],
          ["Previous Window End", comparisonWindow.previousEnd],
        );
      }

      const headers = [
        "Skill",
        "Category",
        "Trend Status",
        "Current Postings",
        "Previous Postings",
        "Growth %",
        "Salary Change",
        "Current Median Salary",
        "Previous Median Salary",
        "Comparison Mode",
      ];

      const dataRows = data.map((skill) => [
        skill.name,
        skill.category,
        skill.trendStatus,
        skill.currentCount,
        skill.previousCount,
        comparisonMode === "contiguous"
          ? Number.isFinite(skill.growthPercentage)
            ? skill.growthPercentage.toFixed(1)
            : "N/A"
          : "N/A",
        formatSalaryDelta(skill.salaryChange),
        formatSalary(skill.currentSalary),
        formatSalary(skill.previousSalary),
        skill.comparisonMode,
      ]);

      const csv = [
        ...metadataRows.map(([key, value]) =>
          [escapeCsvValue(key), escapeCsvValue(value)].join(","),
        ),
        "",
        headers.map(escapeCsvValue).join(","),
        ...dataRows.map((row) => row.map(escapeCsvValue).join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);

      link.href = url;
      link.download = `trends-${sortBy}-${timeframe}d-${stamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Trends exported",
        description: `Downloaded ${data.length} trend rows as CSV.`,
      });
    } catch (error) {
      console.error("Failed to export trends CSV:", error);
      toast({
        title: "Export failed",
        description: "Unable to generate CSV from current trend data.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button className="gap-2 glow-primary" onClick={exportToCsv}>
      <Download className="h-4 w-4" />
      Export Trends
    </Button>
  );
}
